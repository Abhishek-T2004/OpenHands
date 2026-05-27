from __future__ import annotations

import base64
import hashlib
import json
import secrets

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from integrations.models import Message, SourceType
from integrations.utils import IS_LOCAL_DEPLOYMENT
from server.auth.constants import AZURE_DEVOPS_WEBHOOK_SECRET
from storage.redis import get_redis_client_async

from openhands.app_server.utils.logger import openhands_logger as logger

azure_devops_integration_router = APIRouter(prefix="/integration")

_azure_devops_manager = None


def get_azure_devops_manager():
    global _azure_devops_manager
    if _azure_devops_manager is None:
        from integrations.azure_devops.azure_devops_manager import AzureDevOpsManager
        from server.auth.token_manager import TokenManager

        _azure_devops_manager = AzureDevOpsManager(TokenManager())
    return _azure_devops_manager


def _basic_auth_secret(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, encoded = authorization.partition(" ")
    if scheme.lower() != "basic" or not encoded:
        return None
    try:
        decoded = base64.b64decode(encoded).decode()
    except Exception:
        return None
    _, _, password = decoded.partition(":")
    return password or decoded


async def verify_azure_devops_signature(
    header_webhook_secret: str | None,
    authorization: str | None,
) -> None:
    expected_secret = (
        "localdeploymentwebhooktesttoken"
        if IS_LOCAL_DEPLOYMENT
        else AZURE_DEVOPS_WEBHOOK_SECRET
    )
    provided_secret = header_webhook_secret or _basic_auth_secret(authorization)
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure DevOps webhook secret is not configured.",
        )
    if not provided_secret or not secrets.compare_digest(
        provided_secret, expected_secret
    ):
        raise HTTPException(status_code=403, detail="Request signatures didn't match!")


@azure_devops_integration_router.post("/azure-devops/events")
async def azure_devops_events(
    request: Request,
    x_openhands_webhook_secret: str | None = Header(None),
    authorization: str | None = Header(None),
):
    try:
        await verify_azure_devops_signature(
            header_webhook_secret=x_openhands_webhook_secret,
            authorization=authorization,
        )

        payload_data = await request.json()
        dedup_key = payload_data.get("id")
        notification_id = payload_data.get("notificationId")
        if dedup_key:
            dedup_key = f"azure_devops_msg:{dedup_key}:{notification_id or ''}"
        else:
            dedup_json = json.dumps(payload_data, sort_keys=True)
            dedup_hash = hashlib.sha256(dedup_json.encode()).hexdigest()
            dedup_key = f"azure_devops_msg:{dedup_hash}"

        redis = get_redis_client_async()
        created = await redis.set(dedup_key, 1, nx=True, ex=60)
        if not created:
            logger.info("azure_devops_is_duplicate")
            return JSONResponse(
                status_code=200,
                content={"message": "Duplicate Azure DevOps event ignored."},
            )

        message = Message(
            source=SourceType.AZURE_DEVOPS,
            message={
                "payload": payload_data,
                "event_key": payload_data.get("eventType"),
            },
        )
        await get_azure_devops_manager().receive_message(message)

        return JSONResponse(
            status_code=200,
            content={"message": "Azure DevOps events endpoint reached successfully."},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing Azure DevOps event: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid payload."})
