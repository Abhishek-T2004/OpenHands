"""Service hook operations for Azure DevOps integration."""

from typing import Any

from openhands.app_server.integrations.azure_devops.service.base import (
    AzureDevOpsMixinBase,
)
from openhands.app_server.integrations.service_types import RequestMethod

AZURE_DEVOPS_PR_COMMENT_EVENT = 'ms.vss-code.git-pullrequest-comment-event'
AZURE_DEVOPS_WORK_ITEM_COMMENT_EVENT = 'workitem.commented'
AZURE_DEVOPS_WEBHOOK_RESOURCE_VERSION = {
    AZURE_DEVOPS_PR_COMMENT_EVENT: '2.0',
    AZURE_DEVOPS_WORK_ITEM_COMMENT_EVENT: '1.0',
}
AZURE_DEVOPS_SERVICE_HOOK_API_VERSION = '7.1'


class AzureDevOpsWebhooksMixin(AzureDevOpsMixinBase):
    """Mixin for Azure DevOps Service Hooks operations."""

    async def get_repositories_for_webhook_setup(
        self, max_repos: int = 1000
    ) -> list[dict[str, Any]]:
        """Return repositories with project ids needed by Service Hooks."""
        projects_url = f'{self.base_url}/_apis/projects?api-version=7.1'
        projects_response, _ = await self._make_request(projects_url)
        projects = projects_response.get('value', [])

        repositories: list[dict[str, Any]] = []
        for project in projects:
            project_name = project.get('name')
            project_id = project.get('id')
            if not project_name or not project_id:
                continue

            project_enc = self._encode_url_component(project_name)
            repos_url = (
                f'{self.base_url}/{project_enc}/_apis/git/repositories?api-version=7.1'
            )
            repos_response, _ = await self._make_request(repos_url)
            for repo in repos_response.get('value', []):
                repo_id = repo.get('id')
                repo_name = repo.get('name')
                if not repo_id or not repo_name:
                    continue
                repositories.append(
                    {
                        'organization': self.organization,
                        'project_id': project_id,
                        'project_name': project_name,
                        'repo_id': repo_id,
                        'repo_name': repo_name,
                        'full_name': (
                            f'{self.organization}/{project_name}/{repo_name}'
                        ),
                    }
                )
                if len(repositories) >= max_repos:
                    return repositories

        return repositories

    async def list_service_hook_subscriptions(self) -> list[dict[str, Any]]:
        url = (
            f'{self.base_url}/_apis/hooks/subscriptions'
            f'?api-version={AZURE_DEVOPS_SERVICE_HOOK_API_VERSION}'
        )
        response, _ = await self._make_request(url)
        return response.get('value', [])

    async def create_pr_comment_service_hook(
        self,
        *,
        project_id: str,
        repo_id: str,
        webhook_url: str,
        webhook_secret: str,
    ) -> dict[str, Any]:
        return await self._create_service_hook_subscription(
            event_type=AZURE_DEVOPS_PR_COMMENT_EVENT,
            publisher_inputs={'projectId': project_id, 'repository': repo_id},
            webhook_url=webhook_url,
            webhook_secret=webhook_secret,
        )

    async def create_work_item_comment_service_hook(
        self,
        *,
        project_id: str,
        webhook_url: str,
        webhook_secret: str,
    ) -> dict[str, Any]:
        return await self._create_service_hook_subscription(
            event_type=AZURE_DEVOPS_WORK_ITEM_COMMENT_EVENT,
            publisher_inputs={'projectId': project_id},
            webhook_url=webhook_url,
            webhook_secret=webhook_secret,
        )

    async def _create_service_hook_subscription(
        self,
        *,
        event_type: str,
        publisher_inputs: dict[str, str],
        webhook_url: str,
        webhook_secret: str,
    ) -> dict[str, Any]:
        url = (
            f'{self.base_url}/_apis/hooks/subscriptions'
            f'?api-version={AZURE_DEVOPS_SERVICE_HOOK_API_VERSION}'
        )
        payload = {
            'publisherId': 'tfs',
            'eventType': event_type,
            'resourceVersion': AZURE_DEVOPS_WEBHOOK_RESOURCE_VERSION[event_type],
            'consumerId': 'webHooks',
            'consumerActionId': 'httpRequest',
            'publisherInputs': publisher_inputs,
            'consumerInputs': {
                'url': webhook_url,
                'basicAuthUsername': 'openhands',
                'basicAuthPassword': webhook_secret,
                'resourceDetailsToSend': 'all',
                'messagesToSend': 'all',
                'detailedMessagesToSend': 'all',
            },
        }
        response, _ = await self._make_request(
            url=url, params=payload, method=RequestMethod.POST
        )
        return response

    async def delete_service_hook_subscription(self, subscription_id: str) -> None:
        url = (
            f'{self.base_url}/_apis/hooks/subscriptions/{subscription_id}'
            f'?api-version={AZURE_DEVOPS_SERVICE_HOOK_API_VERSION}'
        )
        await self._make_request(url=url, method=RequestMethod.DELETE)
