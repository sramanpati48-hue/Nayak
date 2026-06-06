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
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc

    if settings.CLERK_ISSUER and payload.get("iss") != settings.CLERK_ISSUER:
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
    if not settings.CLERK_SECRET_KEY:
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
        # Log the error but do not raise, ensuring offline/mock modes do not break sync
        import logging
        logging.getLogger("nayak-api").warning(f"Failed to update Clerk metadata for user {user_id}: {exc}")
