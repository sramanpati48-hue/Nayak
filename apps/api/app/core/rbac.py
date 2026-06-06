from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Literal, Optional, Set

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import extract_bearer_token, verify_clerk_token
from app.core.config import settings
from app.db.models import User
from app.db.session import get_db

Role = Literal["normal_user", "law_intern", "lawyer", "judge"]
Permission = Literal[
    "create_case",
    "view_own_case",
    "view_assigned_cases",
    "answer_cross_questions",
    "export_reports",
    "add_intern_notes",
    "mark_lawyer_review_complete",
    "view_judge_evaluation_workspace",
    "assign_roles",
]

ROLE_PERMISSION_MAP: Dict[Role, Set[Permission]] = {
    "normal_user": {"create_case", "view_own_case", "answer_cross_questions", "export_reports"},
    "law_intern": {"view_assigned_cases", "answer_cross_questions", "add_intern_notes", "export_reports"},
    "lawyer": {"view_assigned_cases", "answer_cross_questions", "export_reports", "mark_lawyer_review_complete"},
    "judge": {"view_assigned_cases", "export_reports", "view_judge_evaluation_workspace"},
}

ROLE_LABELS: Dict[Role, str] = {
    "normal_user": "Normal User",
    "law_intern": "Law Intern",
    "lawyer": "Lawyer",
    "judge": "Judge",
}

DEFAULT_REVIEW_ROLES: tuple[Role, ...] = ("law_intern", "lawyer", "judge")


@dataclass(frozen=True)
class RequestActor:
    user_id: str
    role: Role


def _coerce_role(value: Optional[str]) -> Role:
    if value in ROLE_PERMISSION_MAP:
        return value  # type: ignore[return-value]
    return "normal_user"


async def get_request_actor(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RequestActor:
    token = extract_bearer_token(request)

    if token and settings.CLERK_JWKS_URL:
        try:
            payload = verify_clerk_token(token)
            clerk_id = payload.get("sub")
            if clerk_id:
                result = await db.execute(select(User).where(User.id == clerk_id))
                user = result.scalar_one_or_none()
                if user:
                    return RequestActor(user_id=user.id, role=user.role)  # type: ignore[arg-type]
        except HTTPException:
            pass

    if settings.AUTH_ALLOW_HEADER_FALLBACK:
        role = _coerce_role(request.headers.get("X-User-Role") or request.query_params.get("role"))
        user_id = request.headers.get("X-User-Id") or request.query_params.get("user_id") or "anonymous"
        return RequestActor(user_id=user_id, role=role)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
    )


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSION_MAP.get(role, set())


def require_permission(permission: Permission):
    def dependency(actor: RequestActor = Depends(get_request_actor)) -> RequestActor:
        if not has_permission(actor.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{ROLE_LABELS.get(actor.role, 'User')} does not have permission for this action.",
            )
        return actor

    return dependency


def _session_config(session: Any) -> Dict[str, Any]:
    config = getattr(session, "config", None) or {}
    return config if isinstance(config, dict) else {}


def _session_rbac_config(session: Any) -> Dict[str, Any]:
    config = _session_config(session)
    rbac_config = config.get("rbac")
    return rbac_config if isinstance(rbac_config, dict) else {}


def session_owner_id(session: Any) -> Optional[str]:
    config = _session_rbac_config(session)
    owner_id = config.get("creator_user_id") or config.get("created_by_user_id") or config.get("owner_user_id")
    return owner_id if isinstance(owner_id, str) else None


def session_assigned_roles(session: Any) -> Set[Role]:
    config = _session_rbac_config(session)
    raw_roles = config.get("assigned_roles")
    roles: Iterable[str]
    if isinstance(raw_roles, list) and raw_roles:
        roles = [value for value in raw_roles if isinstance(value, str)]
    else:
        roles = DEFAULT_REVIEW_ROLES

    return {_coerce_role(role) for role in roles}


def can_view_session(actor: RequestActor, session: Any) -> bool:
    if actor.role == "normal_user":
        return session_owner_id(session) == actor.user_id

    return actor.role in session_assigned_roles(session) or session_owner_id(session) == actor.user_id


def require_session_access(session: Any, actor: RequestActor) -> None:
    if not can_view_session(actor, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this case workspace.",
        )


def require_session_write_access(session: Any, actor: RequestActor, permission: Permission) -> None:
    require_session_access(session, actor)
    if not has_permission(actor.role, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to change this workspace.",
        )
