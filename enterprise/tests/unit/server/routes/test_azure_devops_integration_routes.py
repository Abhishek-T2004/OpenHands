import base64

import pytest
from fastapi import HTTPException
from server.routes.integration import azure_devops


@pytest.mark.asyncio
async def test_verify_azure_devops_signature_accepts_header_secret(monkeypatch):
    monkeypatch.setattr(azure_devops, "IS_LOCAL_DEPLOYMENT", False)
    monkeypatch.setattr(azure_devops, "AZURE_DEVOPS_WEBHOOK_SECRET", "expected")

    await azure_devops.verify_azure_devops_signature("expected", None)


@pytest.mark.asyncio
async def test_verify_azure_devops_signature_accepts_basic_auth(monkeypatch):
    monkeypatch.setattr(azure_devops, "IS_LOCAL_DEPLOYMENT", False)
    monkeypatch.setattr(azure_devops, "AZURE_DEVOPS_WEBHOOK_SECRET", "expected")
    encoded = base64.b64encode(b"openhands:expected").decode()

    await azure_devops.verify_azure_devops_signature(None, f"Basic {encoded}")


@pytest.mark.asyncio
async def test_verify_azure_devops_signature_rejects_bad_secret(monkeypatch):
    monkeypatch.setattr(azure_devops, "IS_LOCAL_DEPLOYMENT", False)
    monkeypatch.setattr(azure_devops, "AZURE_DEVOPS_WEBHOOK_SECRET", "expected")

    with pytest.raises(HTTPException) as exc_info:
        await azure_devops.verify_azure_devops_signature("wrong", None)

    assert exc_info.value.status_code == 403
