"""Unit tests for GitHub integration routes.

Tests for:
- get_github_token endpoint
"""

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import SecretStr


@pytest.fixture(autouse=True)
def mock_github_dependencies():
    """Mock module-level dependencies before importing the github module.

    The github.py module instantiates GitHubDataCollector at module level,
    which requires GitHub App credentials. We mock these dependencies to
    allow importing the module in test environments without credentials.
    """
    # Store original modules if they exist
    original_modules = {}
    modules_to_mock = [
        'integrations.github.data_collector',
        'integrations.github.github_manager',
        'server.routes.integration.github',
    ]
    for mod in modules_to_mock:
        if mod in sys.modules:
            original_modules[mod] = sys.modules[mod]
            del sys.modules[mod]

    # Create mock GitHubDataCollector that doesn't require credentials
    mock_data_collector_module = MagicMock()
    mock_data_collector_instance = MagicMock()
    mock_data_collector_module.GitHubDataCollector.return_value = (
        mock_data_collector_instance
    )
    sys.modules['integrations.github.data_collector'] = mock_data_collector_module

    # Create mock GithubManager
    mock_github_manager_module = MagicMock()
    mock_github_manager_instance = MagicMock()
    mock_github_manager_module.GithubManager.return_value = mock_github_manager_instance
    sys.modules['integrations.github.github_manager'] = mock_github_manager_module

    yield

    # Clean up the mocked modules
    for mod in modules_to_mock:
        if mod in sys.modules:
            del sys.modules[mod]

    # Restore original modules
    for mod, original in original_modules.items():
        sys.modules[mod] = original


class TestGitHubTokenResponse:
    """Test suite for GitHubTokenResponse model."""

    def test_github_token_response_with_valid_token(self):
        """GitHubTokenResponse should accept a valid access_token."""
        from server.routes.integration.github import GitHubTokenResponse

        response = GitHubTokenResponse(access_token='ghp_test_token_12345')
        assert response.access_token == 'ghp_test_token_12345'

    def test_github_token_response_model_dump(self):
        """GitHubTokenResponse model_dump should include access_token."""
        from server.routes.integration.github import GitHubTokenResponse

        response = GitHubTokenResponse(access_token='ghp_test_token_12345')
        data = response.model_dump()
        assert data['access_token'] == 'ghp_test_token_12345'


class TestGetGitHubToken:
    """Test suite for get_github_token endpoint."""

    @pytest.fixture
    def mock_request(self):
        """Create a mock request object."""
        request = MagicMock()
        request.state = MagicMock()
        return request

    @pytest.fixture
    def mock_saas_user_auth(self):
        """Create a mock SaasUserAuth object."""
        from openhands.app_server.integrations.provider import (
            ProviderToken,
            ProviderType,
        )

        mock_auth = AsyncMock()
        mock_auth.get_provider_tokens = AsyncMock(
            return_value={
                ProviderType.GITHUB: ProviderToken(
                    token=SecretStr('ghp_test_token_12345')
                )
            }
        )
        return mock_auth

    @pytest.mark.asyncio
    async def test_get_github_token_success(self, mock_request, mock_saas_user_auth):
        """Should return GitHub token when user has a valid token."""
        from server.routes.integration.github import (
            GitHubTokenResponse,
            get_github_token,
        )

        with patch(
            'server.routes.integration.github.get_user_auth',
            return_value=mock_saas_user_auth,
        ):
            result = await get_github_token(mock_request)

        assert isinstance(result, GitHubTokenResponse)
        assert result.access_token == 'ghp_test_token_12345'
        mock_saas_user_auth.get_provider_tokens.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_github_token_no_provider_tokens(self, mock_request):
        """Should raise 404 when user has no provider tokens."""
        from fastapi import HTTPException
        from server.routes.integration.github import get_github_token

        mock_auth = AsyncMock()
        mock_auth.get_provider_tokens = AsyncMock(return_value=None)

        with (
            patch(
                'server.routes.integration.github.get_user_auth',
                return_value=mock_auth,
            ),
            pytest.raises(HTTPException) as exc_info,
        ):
            await get_github_token(mock_request)

        assert exc_info.value.status_code == 404
        assert 'No provider tokens' in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_github_token_no_github_token(self, mock_request):
        """Should raise 404 when user has provider tokens but no GitHub token."""
        from fastapi import HTTPException
        from server.routes.integration.github import get_github_token

        from openhands.app_server.integrations.provider import (
            ProviderToken,
            ProviderType,
        )

        mock_auth = AsyncMock()
        # Return GitLab token but no GitHub token
        mock_auth.get_provider_tokens = AsyncMock(
            return_value={
                ProviderType.GITLAB: ProviderToken(
                    token=SecretStr('glpat_test_token_12345')
                )
            }
        )

        with (
            patch(
                'server.routes.integration.github.get_user_auth',
                return_value=mock_auth,
            ),
            pytest.raises(HTTPException) as exc_info,
        ):
            await get_github_token(mock_request)

        assert exc_info.value.status_code == 404
        assert 'No GitHub token' in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_github_token_empty_provider_tokens(self, mock_request):
        """Should raise 404 when user has empty provider tokens dict."""
        from fastapi import HTTPException
        from server.routes.integration.github import get_github_token

        mock_auth = AsyncMock()
        mock_auth.get_provider_tokens = AsyncMock(return_value={})

        with (
            patch(
                'server.routes.integration.github.get_user_auth',
                return_value=mock_auth,
            ),
            pytest.raises(HTTPException) as exc_info,
        ):
            await get_github_token(mock_request)

        assert exc_info.value.status_code == 404
        # Empty dict is falsy, so it triggers the "no provider tokens" error
        assert 'No provider tokens' in exc_info.value.detail
