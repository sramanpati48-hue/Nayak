from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import extract_bearer_token, update_clerk_public_metadata, verify_clerk_token
from app.core.config import settings
from app.core.rbac import RequestActor, Role, _coerce_role
from app.db.models import User
from app.db.session import get_db

router = APIRouter()

PortalTarget = Literal["judge", "portal"]
PORTAL_ROLE_MAP: dict[PortalTarget, Role] = {
    "judge": "judge",
    "portal": "normal_user",
}


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    role: Role
    portal: Optional[str] = None


class UserSyncRequest(BaseModel):
    portal: PortalTarget = Field(..., description="Gateway portal selected by the user")
    intended_role: Optional[Role] = None


async def get_authenticated_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = extract_bearer_token(request)

    if token and settings.CLERK_JWKS_URL:
        payload = verify_clerk_token(token)
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

        result = await db.execute(select(User).where(User.id == clerk_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
        return user

    if settings.AUTH_ALLOW_HEADER_FALLBACK:
        role = _coerce_role(request.headers.get("X-User-Role") or request.query_params.get("role"))
        user_id = request.headers.get("X-User-Id") or request.query_params.get("user_id") or "anonymous"
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            return user

        user = User(
            id=user_id,
            email=None,
            role=role,
            portal="portal",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user(user: User = Depends(get_authenticated_user)) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        portal=user.portal,
    )


@router.post("/sync", response_model=UserProfileResponse)
async def sync_current_user(
    payload: UserSyncRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    token = extract_bearer_token(request)
    clerk_id: Optional[str] = None
    email: Optional[str] = None

    if token and settings.CLERK_JWKS_URL:
        claims = verify_clerk_token(token)
        clerk_id = claims.get("sub")
        email = claims.get("email")
    elif settings.AUTH_ALLOW_HEADER_FALLBACK:
        clerk_id = request.headers.get("X-User-Id") or request.query_params.get("user_id")
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    if not clerk_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authenticated user id.")

    result = await db.execute(select(User).where(User.id == clerk_id))
    user = result.scalar_one_or_none()

    default_role = PORTAL_ROLE_MAP[payload.portal]
    requested_role = payload.intended_role or default_role

    if not user:
        role = requested_role
        if payload.portal == "judge":
            role = "judge"
        elif payload.portal == "portal":
            role = requested_role if requested_role in {"normal_user", "lawyer", "law_intern"} else "normal_user"

        user = User(
            id=clerk_id,
            email=email,
            role=role,
            portal=payload.portal,
        )
        db.add(user)
    else:
        user.portal = payload.portal
        if payload.portal == "judge":
            user.role = "judge"
        elif payload.portal == "portal":
            if requested_role in {"normal_user", "lawyer", "law_intern"}:
                user.role = requested_role
            elif user.role not in {"normal_user", "lawyer", "law_intern"}:
                user.role = "normal_user"
        if email and not user.email:
            user.email = email

    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        # Retrieve the user created by the concurrent request
        result = await db.execute(select(User).where(User.id == clerk_id))
        user = result.scalar_one_or_none()
        if not user:
            raise
        user.portal = payload.portal
        if payload.portal == "judge":
            user.role = "judge"
        elif payload.portal == "portal":
            if requested_role in {"normal_user", "lawyer", "law_intern"}:
                user.role = requested_role
            elif user.role not in {"normal_user", "lawyer", "law_intern"}:
                user.role = "normal_user"
        if email and not user.email:
            user.email = email
        await db.commit()
        await db.refresh(user)

    await update_clerk_public_metadata(user.id, {"role": user.role, "portal": user.portal})

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        portal=user.portal,
    )


def user_to_actor(user: User) -> RequestActor:
    return RequestActor(user_id=user.id, role=user.role)
