from __future__ import annotations

import time
from typing import Any, Dict, Optional

import httpx
import jwt
from fastapi import HTTPException, Request, status
from jwt import PyJWKClient

from app.core.config import settings

_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if not settings.CLERK_JWKS_URL:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)
    return _jwks_client


def verify_clerk_token(token: str) -> Dict[str, Any]:
    client = _get_jwks_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk authentication is not configured on the API.",
        )

    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token or JWKS lookup failed: {exc}",
        ) from exc

    if settings.CLERK_ISSUER:
        # Normalize trailing slashes for robustness
        issuer = settings.CLERK_ISSUER.rstrip("/")
        token_iss = payload.get("iss", "").rstrip("/")
        if token_iss != issuer:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token issuer.",
            )

    if payload.get("exp") and payload["exp"] < time.time():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token expired.",
        )

    return payload


def extract_bearer_token(request: Request) -> Optional[str]:
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1].strip()

    token = request.query_params.get("token")
    return token.strip() if token else None


async def update_clerk_public_metadata(user_id: str, metadata: Dict[str, Any]) -> None:
    if not settings.CLERK_SECRET_KEY or user_id == "anonymous":
        return

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.patch(
                f"https://api.clerk.com/v1/users/{user_id}/metadata",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json={"public_metadata": metadata},
            )
    except Exception as exc:
        # Avoid blocking user sync flow if Clerk is temporarily down or API keys are invalid
        import logging
        logger = logging.getLogger("app")
        logger.error(f"Failed to update Clerk user metadata for {user_id}: {exc}")
