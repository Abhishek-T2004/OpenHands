"""Integration test for user auth settings flow."""

from unittest.mock import AsyncMock, patch

import pytest

from openhands.app_server.mcp.mcp_config_adapter import mcp_config_server_map
from openhands.app_server.settings.file_settings_store import FileSettingsStore
from openhands.app_server.settings.settings_models import Settings
from openhands.app_server.user_auth.default_user_auth import DefaultUserAuth


@pytest.mark.asyncio
async def test_user_auth_returns_stored_settings():
    """Test that user auth returns stored settings."""
    stored_settings = Settings(
        agent_settings={
            'llm': {'model': 'anthropic/claude-sonnet-4-5-20250929'},
            'mcp_config': {
                'frontend': {
                    'url': 'http://frontend-server.com',
                    'transport': 'sse',
                }
            },
        },
    )

    user_auth = DefaultUserAuth()

    mock_settings_store = AsyncMock(spec=FileSettingsStore)
    mock_settings_store.load.return_value = stored_settings

    with patch.object(
        user_auth, 'get_user_settings_store', return_value=mock_settings_store
    ):
        settings = await user_auth.get_user_settings()

    assert settings is not None
    assert settings.agent_settings.llm.model == 'anthropic/claude-sonnet-4-5-20250929'
    servers = mcp_config_server_map(settings.agent_settings.mcp_config)
    assert len(servers) == 1
    assert 'frontend' in servers


@pytest.mark.asyncio
async def test_user_auth_caching_behavior():
    """Test that user auth caches settings correctly."""
    stored_settings = Settings(
        agent_settings={
            'llm': {'model': 'anthropic/claude-sonnet-4-5-20250929'},
            'mcp_config': {
                'frontend': {
                    'url': 'http://frontend-server.com',
                    'transport': 'sse',
                }
            },
        },
    )

    user_auth = DefaultUserAuth()

    mock_settings_store = AsyncMock(spec=FileSettingsStore)
    mock_settings_store.load.return_value = stored_settings

    with patch.object(
        user_auth, 'get_user_settings_store', return_value=mock_settings_store
    ):
        settings1 = await user_auth.get_user_settings()
        settings2 = await user_auth.get_user_settings()

    assert settings1 is settings2
    mock_settings_store.load.assert_called_once()


@pytest.mark.asyncio
async def test_user_auth_no_stored_settings():
    """Test behavior when no settings are stored (first time user)."""
    user_auth = DefaultUserAuth()

    # Mock settings store to return None (no stored settings)
    mock_settings_store = AsyncMock(spec=FileSettingsStore)
    mock_settings_store.load.return_value = None

    with patch.object(
        user_auth, 'get_user_settings_store', return_value=mock_settings_store
    ):
        settings = await user_auth.get_user_settings()

    # Should return None when no settings are stored
    assert settings is None
