export interface NavItem {
  id: string;
  title: string;
  route: string;
  children?: NavItem[];
  badge?: string;
  isNew?: boolean;
}

export interface TopTab {
  id: string;
  title: string;
  slug: string;
  icon?: string;
}

export const topTabs: TopTab[] = [
  // ── OpenHands (OSS + Cloud) ──────────────────────────────────────────────
  { id: 'introduction',     title: 'Introduction',     slug: '/' },
  { id: 'getting-started',  title: 'Getting Started',  slug: '/getting-started' },
  { id: 'installation',     title: 'Installation',     slug: '/installation' },
  { id: 'products',         title: 'Products',         slug: '/products' },
  { id: 'features',         title: 'Features',         slug: '/features' },
  { id: 'api',              title: 'API Reference',    slug: '/api' },
  { id: 'configuration',    title: 'Configuration',    slug: '/configuration' },
  { id: 'integrations',     title: 'Integrations',     slug: '/integrations' },
  { id: 'enterprise',       title: 'Enterprise',       slug: '/enterprise' },
  { id: 'contributing',     title: 'Contributing',     slug: '/contributing' },
  { id: 'changelog',        title: 'Changelog',        slug: '/changelog' },

  // ── Deploy Repo ──────────────────────────────────────────────────────────
  { id: 'deploy-overview',     title: 'Deploy: Overview',     slug: '/deploy' },
  { id: 'deploy-architecture', title: 'Deploy: Architecture', slug: '/deploy/architecture' },
  { id: 'deploy-components',   title: 'Deploy: Components',   slug: '/deploy/components' },
  { id: 'environments',        title: 'Environments',         slug: '/deploy/environments' },
  { id: 'release-and-deploy',  title: 'Release & Deploy',     slug: '/deploy/release' },
  { id: 'secrets-and-ops',     title: 'Secrets & Ops',        slug: '/deploy/secrets' },
  { id: 'deploy-testing',      title: 'Deploy: Testing',      slug: '/deploy/testing' },
  { id: 'cicd-reference',      title: 'CI/CD Reference',      slug: '/deploy/cicd' },
  { id: 'deploy-dev-guide',    title: 'Deploy: Dev Guide',    slug: '/deploy/dev-guide' },
];

export const navigationByTab: Record<string, NavItem[]> = {
  introduction: [
    {
      id: 'what-is-openhands',
      title: 'What is OpenHands?',
      route: '/',
    },
    {
      id: 'architecture',
      title: 'Architecture Overview',
      route: '/architecture',
    },
    {
      id: 'how-it-works',
      title: 'How Agents Work',
      route: '/how-it-works',
    },
    {
      id: 'comparison',
      title: 'Comparison Table',
      route: '/comparison',
    },
    {
      id: 'faq',
      title: 'FAQ',
      route: '/faq',
    },
  ],

  'getting-started': [
    {
      id: 'gs-cloud',
      title: 'Quickstart — Cloud',
      route: '/getting-started/cloud',
    },
    {
      id: 'gs-local-oss',
      title: 'Quickstart — Local GUI (OSS)',
      route: '/getting-started/local-oss',
    },
    {
      id: 'gs-local-saas',
      title: 'Quickstart — Local GUI (SaaS)',
      route: '/getting-started/local-saas',
    },
    {
      id: 'gs-cli',
      title: 'Quickstart — CLI',
      route: '/getting-started/cli',
    },
    {
      id: 'gs-sdk',
      title: 'Quickstart — SDK',
      route: '/getting-started/sdk',
    },
    {
      id: 'onboarding',
      title: 'Onboarding Flow',
      route: '/getting-started/onboarding',
    },
  ],

  installation: [
    {
      id: 'install-local-oss',
      title: 'Local GUI — OSS',
      route: '/installation/local-oss',
      children: [
        { id: 'docker', title: 'Docker (Recommended)', route: '/installation/local-oss/docker' },
        { id: 'docker-compose', title: 'Docker Compose', route: '/installation/local-oss/docker-compose' },
        { id: 'macos', title: 'macOS from Source', route: '/installation/local-oss/macos' },
        { id: 'linux', title: 'Linux from Source', route: '/installation/local-oss/linux' },
        { id: 'windows', title: 'Windows (WSL2)', route: '/installation/local-oss/windows' },
        { id: 'devcontainer', title: 'Dev Container', route: '/installation/local-oss/devcontainer' },
        { id: 'docker-dev', title: 'Docker Dev Environment', route: '/installation/local-oss/docker-dev' },
        { id: 'no-sudo', title: 'No-sudo (Conda/Mamba)', route: '/installation/local-oss/no-sudo' },
      ],
    },
    {
      id: 'install-local-saas',
      title: 'Local GUI — SaaS Mode',
      route: '/installation/local-saas',
      children: [
        { id: 'saas-overview', title: 'Overview', route: '/installation/local-saas' },
        { id: 'saas-prereqs', title: 'Prerequisites', route: '/installation/local-saas/prerequisites' },
        { id: 'saas-run', title: 'Build & Run', route: '/installation/local-saas/run' },
        { id: 'saas-llm', title: 'LLM Configuration', route: '/installation/local-saas/llm-config' },
        { id: 'saas-headless', title: 'Headless / CLI Config', route: '/installation/local-saas/headless-config' },
      ],
    },
    {
      id: 'install-cloud',
      title: 'OpenHands Cloud',
      route: '/installation/cloud',
      children: [
        { id: 'cloud-access', title: 'Accessing Cloud', route: '/installation/cloud' },
        { id: 'cloud-repo', title: 'Connecting a Repository', route: '/installation/cloud/connect-repo' },
        { id: 'cloud-org', title: 'Organization Setup', route: '/installation/cloud/organization' },
        { id: 'cloud-billing', title: 'Billing & Plans', route: '/installation/cloud/billing' },
      ],
    },
    {
      id: 'install-enterprise',
      title: 'Enterprise Self-Hosted',
      route: '/installation/enterprise',
      children: [
        { id: 'ent-overview', title: 'Overview', route: '/installation/enterprise' },
        { id: 'ent-k8s', title: 'Kubernetes Setup', route: '/installation/enterprise/kubernetes' },
        { id: 'ent-db', title: 'Database & Storage', route: '/installation/enterprise/database' },
        { id: 'ent-auth', title: 'Authentication', route: '/installation/enterprise/auth' },
        { id: 'ent-maint', title: 'Maintenance Tasks', route: '/installation/enterprise/maintenance' },
        { id: 'ent-license', title: 'License', route: '/installation/enterprise/license' },
      ],
    },
    {
      id: 'install-sdk',
      title: 'SDK',
      route: '/installation/sdk',
    },
    {
      id: 'install-cli',
      title: 'CLI',
      route: '/installation/cli',
    },
  ],

  products: [
    { id: 'prod-sdk', title: 'SDK Overview', route: '/products/sdk' },
    { id: 'prod-cli', title: 'CLI Overview', route: '/products/cli' },
    { id: 'prod-local-gui', title: 'Local GUI Overview', route: '/products/local-gui' },
    { id: 'prod-cloud', title: 'Cloud Overview', route: '/products/cloud' },
    { id: 'prod-enterprise', title: 'Enterprise Overview', route: '/products/enterprise' },
  ],

  features: [
    {
      id: 'feat-core',
      title: 'Core Agent Features',
      route: '/features',
      children: [
        { id: 'feat-conversations', title: 'Conversations', route: '/features/conversations' },
        { id: 'feat-agent-state', title: 'Agent State Machine', route: '/features/agent-state' },
        { id: 'feat-planner', title: 'Task Planning', route: '/features/planner' },
        { id: 'feat-sandbox', title: 'Sandbox Execution', route: '/features/sandbox' },
        { id: 'feat-file-editing', title: 'File Editing', route: '/features/file-editing' },
        { id: 'feat-terminal', title: 'Terminal', route: '/features/terminal' },
        { id: 'feat-browser', title: 'Browser Control', route: '/features/browser' },
        { id: 'feat-vscode', title: 'VSCode Integration', route: '/features/vscode' },
        { id: 'feat-sharing', title: 'Shared Conversations', route: '/features/sharing' },
        { id: 'feat-recent', title: 'Recent Conversations', route: '/features/recent-conversations' },
      ],
    },
    {
      id: 'feat-settings',
      title: 'Settings & Configuration',
      route: '/features/settings',
      children: [
        { id: 'feat-llm', title: 'LLM Settings', route: '/features/settings/llm' },
        { id: 'feat-agent-settings', title: 'Agent Settings', route: '/features/settings/agent' },
        { id: 'feat-condenser', title: 'Condenser Settings', route: '/features/settings/condenser' },
        { id: 'feat-verification', title: 'Verification Settings', route: '/features/settings/verification' },
        { id: 'feat-mcp-settings', title: 'MCP Settings', route: '/features/settings/mcp' },
        { id: 'feat-skills-settings', title: 'Skills Settings', route: '/features/settings/skills' },
        { id: 'feat-secrets', title: 'Secrets Management', route: '/features/settings/secrets' },
        { id: 'feat-api-keys', title: 'API Keys', route: '/features/settings/api-keys' },
        { id: 'feat-user-settings', title: 'User Settings', route: '/features/settings/user' },
      ],
    },
    {
      id: 'feat-org',
      title: 'Org & Cloud Features',
      route: '/features/org',
      children: [
        { id: 'feat-org-mgmt', title: 'Organization Management', route: '/features/org' },
        { id: 'feat-org-defaults', title: 'Org Defaults', route: '/features/org-defaults' },
        { id: 'feat-billing', title: 'Billing', route: '/features/billing' },
      ],
    },
    {
      id: 'feat-dev',
      title: 'Developer/Integration',
      route: '/features/dev',
      children: [
        { id: 'feat-skills', title: 'Skills System', route: '/features/skills' },
        { id: 'feat-webhooks', title: 'Webhooks', route: '/features/webhooks' },
        { id: 'feat-mcp', title: 'MCP Protocol', route: '/features/mcp' },
        { id: 'feat-pending', title: 'Pending Messages', route: '/features/pending-messages' },
        { id: 'feat-analytics', title: 'Analytics', route: '/features/analytics' },
      ],
    },
  ],

  api: [
    {
      id: 'api-overview',
      title: 'Overview',
      route: '/api',
      children: [
        { id: 'api-intro', title: 'API Overview', route: '/api' },
        { id: 'api-auth', title: 'Authentication', route: '/api/auth' },
      ],
    },
    {
      id: 'api-conversations',
      title: 'Conversations',
      route: '/api/conversations',
      children: [
        { id: 'api-conv-list', title: 'List Conversations', route: '/api/conversations/list' },
        { id: 'api-conv-count', title: 'Count Conversations', route: '/api/conversations/count' },
        { id: 'api-conv-start', title: 'Start Conversation', route: '/api/conversations/start' },
        { id: 'api-conv-update', title: 'Update Conversation', route: '/api/conversations/update' },
        { id: 'api-conv-delete', title: 'Delete Conversation', route: '/api/conversations/delete' },
        { id: 'api-conv-send', title: 'Send Message', route: '/api/conversations/send-message' },
        { id: 'api-conv-stream', title: 'Stream Start', route: '/api/conversations/stream' },
        { id: 'api-conv-export', title: 'Export Conversation', route: '/api/conversations/export' },
        { id: 'api-conv-file', title: 'Read File', route: '/api/conversations/file' },
        { id: 'api-conv-skills', title: 'Get Skills', route: '/api/conversations/skills' },
        { id: 'api-conv-hooks', title: 'Get Hooks', route: '/api/conversations/hooks' },
        { id: 'api-conv-profile', title: 'Switch Profile', route: '/api/conversations/profile' },
        { id: 'api-conv-tasks', title: 'Start Tasks', route: '/api/conversations/start-tasks' },
      ],
    },
    {
      id: 'api-events',
      title: 'Events',
      route: '/api/events',
      children: [
        { id: 'api-events-list', title: 'List Events', route: '/api/events/list' },
        { id: 'api-events-count', title: 'Count Events', route: '/api/events/count' },
        { id: 'api-events-search', title: 'Search Events', route: '/api/events/search' },
      ],
    },
    {
      id: 'api-sandboxes',
      title: 'Sandboxes',
      route: '/api/sandboxes',
      children: [
        { id: 'api-sb-list', title: 'List Sandboxes', route: '/api/sandboxes/list' },
        { id: 'api-sb-create', title: 'Create Sandbox', route: '/api/sandboxes/create' },
        { id: 'api-sb-pause', title: 'Pause Sandbox', route: '/api/sandboxes/pause' },
        { id: 'api-sb-resume', title: 'Resume Sandbox', route: '/api/sandboxes/resume' },
        { id: 'api-sb-delete', title: 'Delete Sandbox', route: '/api/sandboxes/delete' },
        { id: 'api-sb-secrets', title: 'Sandbox Secrets', route: '/api/sandboxes/secrets' },
      ],
    },
    {
      id: 'api-settings',
      title: 'Settings',
      route: '/api/settings',
      children: [
        { id: 'api-settings-get', title: 'Get Settings', route: '/api/settings/get' },
        { id: 'api-settings-update', title: 'Update Settings', route: '/api/settings/update' },
        { id: 'api-settings-agent', title: 'Agent Schema', route: '/api/settings/agent-schema' },
        { id: 'api-settings-conv', title: 'Conversation Schema', route: '/api/settings/conversation-schema' },
        { id: 'api-settings-profiles', title: 'List Profiles', route: '/api/settings/profiles' },
        { id: 'api-settings-profile', title: 'Get Profile', route: '/api/settings/profile-detail' },
        { id: 'api-settings-profile-create', title: 'Create Profile', route: '/api/settings/profile-create' },
        { id: 'api-settings-profile-delete', title: 'Delete Profile', route: '/api/settings/profile-delete' },
        { id: 'api-settings-profile-activate', title: 'Activate Profile', route: '/api/settings/profile-activate' },
        { id: 'api-settings-profile-rename', title: 'Rename Profile', route: '/api/settings/profile-rename' },
      ],
    },
    {
      id: 'api-secrets',
      title: 'Secrets',
      route: '/api/secrets',
      children: [
        { id: 'api-secrets-list', title: 'List Secrets', route: '/api/secrets/list' },
        { id: 'api-secrets-create', title: 'Create Secret', route: '/api/secrets/create' },
        { id: 'api-secrets-update', title: 'Update Secret', route: '/api/secrets/update' },
        { id: 'api-secrets-delete', title: 'Delete Secret', route: '/api/secrets/delete' },
      ],
    },
    {
      id: 'api-git',
      title: 'Git',
      route: '/api/git',
      children: [
        { id: 'api-git-installs', title: 'Search Installations', route: '/api/git/installations' },
        { id: 'api-git-repos', title: 'Search Repositories', route: '/api/git/repositories' },
        { id: 'api-git-branches', title: 'Search Branches', route: '/api/git/branches' },
        { id: 'api-git-tasks', title: 'Suggested Tasks', route: '/api/git/tasks' },
      ],
    },
    {
      id: 'api-webhooks',
      title: 'Webhooks',
      route: '/api/webhooks',
      children: [
        { id: 'api-wh-convs', title: 'Webhook for Conversations', route: '/api/webhooks/conversations' },
        { id: 'api-wh-events', title: 'Webhook for Events', route: '/api/webhooks/events' },
        { id: 'api-wh-secrets', title: 'Webhook Secrets', route: '/api/webhooks/secrets' },
      ],
    },
    {
      id: 'api-users',
      title: 'Users',
      route: '/api/users',
      children: [
        { id: 'api-users-me', title: 'Get Current User', route: '/api/users/me' },
        { id: 'api-users-git', title: 'Get Git Info', route: '/api/users/git-info' },
        { id: 'api-users-skills', title: 'Get Skills', route: '/api/users/skills' },
      ],
    },
    {
      id: 'api-config',
      title: 'Config & Status',
      route: '/api/config',
      children: [
        { id: 'api-config-web', title: 'Web Client Config', route: '/api/config' },
        { id: 'api-health', title: 'Health / Readiness', route: '/api/health' },
      ],
    },
    {
      id: 'api-mcp',
      title: 'MCP',
      route: '/api/mcp',
      children: [
        { id: 'api-mcp-overview', title: 'MCP Overview', route: '/api/mcp' },
        { id: 'api-mcp-tools', title: 'MCP Tools', route: '/api/mcp/tools' },
      ],
    },
    {
      id: 'api-enterprise',
      title: 'Enterprise APIs',
      route: '/api/enterprise',
      badge: 'Enterprise',
      children: [
        { id: 'api-ent-auth', title: 'Auth', route: '/api/enterprise/auth' },
        { id: 'api-ent-orgs', title: 'Org Management', route: '/api/enterprise/orgs' },
        { id: 'api-ent-members', title: 'Org Members', route: '/api/enterprise/org-members' },
        { id: 'api-ent-invites', title: 'Org Invitations', route: '/api/enterprise/invitations' },
        { id: 'api-ent-profiles', title: 'Org Profiles', route: '/api/enterprise/org-profiles' },
        { id: 'api-ent-keys', title: 'API Keys', route: '/api/enterprise/api-keys' },
        { id: 'api-ent-billing', title: 'Billing', route: '/api/enterprise/billing' },
        { id: 'api-ent-analytics', title: 'Analytics Events', route: '/api/enterprise/analytics' },
        { id: 'api-ent-git', title: 'GitHub/Bitbucket Proxy', route: '/api/enterprise/git-proxy' },
        { id: 'api-ent-oauth', title: 'OAuth Device', route: '/api/enterprise/oauth-device' },
      ],
    },
  ],

  configuration: [
    { id: 'config-all', title: 'All Config Options', route: '/configuration' },
    { id: 'config-env', title: 'Environment Variables', route: '/configuration/env-vars' },
    { id: 'config-llm', title: 'LLM Configuration', route: '/configuration/llm' },
    { id: 'config-agent', title: 'Agent Configuration', route: '/configuration/agent' },
    { id: 'config-condenser', title: 'Condenser Configuration', route: '/configuration/condenser' },
    { id: 'config-sandbox', title: 'Sandbox Configuration', route: '/configuration/sandbox' },
    { id: 'config-docker', title: 'Docker Image Reference', route: '/configuration/docker-images' },
  ],

  integrations: [
    { id: 'int-github', title: 'GitHub', route: '/integrations/github' },
    { id: 'int-gitlab', title: 'GitLab', route: '/integrations/gitlab' },
    { id: 'int-bitbucket', title: 'Bitbucket Cloud', route: '/integrations/bitbucket' },
    { id: 'int-bitbucket-dc', title: 'Bitbucket Data Center', route: '/integrations/bitbucket-dc' },
    { id: 'int-azure', title: 'Azure DevOps', route: '/integrations/azure-devops' },
    { id: 'int-forgejo', title: 'Forgejo', route: '/integrations/forgejo' },
    { id: 'int-jira', title: 'Jira', route: '/integrations/jira' },
    { id: 'int-slack', title: 'Slack', route: '/integrations/slack' },
    { id: 'int-linear', title: 'Linear', route: '/integrations/linear' },
    { id: 'int-mcp', title: 'MCP Servers', route: '/integrations/mcp' },
  ],

  enterprise: [
    { id: 'ent-arch', title: 'Architecture', route: '/enterprise/architecture' },
    { id: 'ent-install', title: 'Installation', route: '/enterprise/installation' },
    { id: 'ent-auth', title: 'Authentication & SSO', route: '/enterprise/auth' },
    { id: 'ent-rbac', title: 'RBAC & Permissions', route: '/enterprise/rbac' },
    { id: 'ent-org', title: 'Org Administration', route: '/enterprise/org' },
    { id: 'ent-db', title: 'Database Setup', route: '/enterprise/database' },
    { id: 'ent-storage', title: 'Storage', route: '/enterprise/storage' },
    { id: 'ent-models', title: 'Verified Models', route: '/enterprise/verified-models' },
    { id: 'ent-maint', title: 'Maintenance', route: '/enterprise/maintenance' },
    { id: 'ent-license', title: 'License', route: '/enterprise/license' },
  ],

  contributing: [
    { id: 'contrib-overview', title: 'Overview', route: '/contributing' },
    { id: 'contrib-dev-setup', title: 'Development Setup', route: '/contributing/dev-setup' },
    { id: 'contrib-frontend', title: 'Frontend (React)', route: '/contributing/frontend' },
    { id: 'contrib-backend', title: 'Backend (Python)', route: '/contributing/backend' },
    { id: 'contrib-app-server', title: 'App Server', route: '/contributing/app-server' },
    { id: 'contrib-testing', title: 'Testing', route: '/contributing/testing' },
    { id: 'contrib-pr', title: 'PR Process', route: '/contributing/pr-process' },
    { id: 'contrib-eval', title: 'Evaluation & Benchmarks', route: '/contributing/evaluation' },
    { id: 'contrib-docs', title: 'Documentation Style', route: '/contributing/docs-style' },
    { id: 'contrib-maintainers', title: 'Becoming a Maintainer', route: '/contributing/maintainers' },
  ],

  changelog: [
    { id: 'changelog-notes', title: 'Release Notes', route: '/changelog' },
    { id: 'changelog-migration', title: 'Migration Guides', route: '/changelog/migration' },
  ],

  // ── Deploy Repo ────────────────────────────────────────────────────────────

  'deploy-overview': [
    { id: 'deploy-what',       title: 'What Is This Repo?',          route: '/deploy' },
    { id: 'deploy-structure',  title: 'Repository Structure',         route: '/deploy/structure' },
    { id: 'deploy-license',    title: 'License (Polyform Free Trial)', route: '/deploy/license' },
    { id: 'deploy-versioning', title: 'Versioning & Release Cadence', route: '/deploy/versioning' },
    { id: 'deploy-envs-glance',title: 'Environments at a Glance',     route: '/deploy/environments-glance' },
  ],

  'deploy-architecture': [
    {
      id: 'darch-system',
      title: 'System Architecture',
      route: '/deploy/architecture',
      children: [
        { id: 'darch-diagram',  title: 'High-Level Diagram',        route: '/deploy/architecture/diagram' },
        { id: 'darch-gcp',      title: 'GCP / Kubernetes Overview', route: '/deploy/architecture/gcp-k8s' },
        { id: 'darch-network',  title: 'Networking & Ingress',      route: '/deploy/architecture/networking' },
      ],
    },
    {
      id: 'darch-deploy-model',
      title: 'Deployment Model',
      route: '/deploy/architecture/deployment-model',
      children: [
        { id: 'darch-flow',   title: 'Feature → Staging → Production Flow', route: '/deploy/architecture/release-flow' },
        { id: 'darch-helm',   title: 'Helm Chart Strategy',                  route: '/deploy/architecture/helm-strategy' },
        { id: 'darch-images', title: 'Image Tagging Convention',             route: '/deploy/architecture/image-tags' },
      ],
    },
    {
      id: 'darch-conv-mgr',
      title: 'Clustered Conversation Manager',
      route: '/deploy/architecture/conversation-manager',
      children: [
        { id: 'darch-redis',      title: 'How Redis Is Used',       route: '/deploy/architecture/conversation-manager/redis' },
        { id: 'darch-agent-loop', title: 'Agent Loop vs. Worker Node', route: '/deploy/architecture/conversation-manager/agent-loop' },
        { id: 'darch-failover',   title: 'Failover Behavior',       route: '/deploy/architecture/conversation-manager/failover' },
      ],
    },
  ],

  'deploy-components': [
    {
      id: 'dc-openhands',
      title: 'OpenHands App',
      route: '/deploy/components/openhands',
      children: [
        { id: 'dc-oh-overview',       title: 'Overview',                      route: '/deploy/components/openhands' },
        { id: 'dc-oh-main',           title: 'Main Deployment',               route: '/deploy/components/openhands/main-deployment' },
        { id: 'dc-oh-github-events',  title: 'GitHub Events Deployment',      route: '/deploy/components/openhands/github-events' },
        { id: 'dc-oh-helm',           title: 'Helm Chart Reference',          route: '/deploy/components/openhands/helm' },
        { id: 'dc-oh-hpa',            title: 'HPA / Scaling',                 route: '/deploy/components/openhands/hpa' },
        { id: 'dc-oh-waitlist',       title: 'User Waitlist ConfigMap',        route: '/deploy/components/openhands/waitlist' },
        { id: 'dc-oh-webhooks',       title: 'GITHUB_WEBHOOKS_ENABLED Flag',  route: '/deploy/components/openhands/webhooks-flag' },
      ],
    },
    {
      id: 'dc-data-platform',
      title: 'Data Platform',
      route: '/deploy/components/data-platform',
      children: [
        { id: 'dc-dp-overview', title: 'Overview',                  route: '/deploy/components/data-platform' },
        { id: 'dc-dp-routes',   title: 'FastAPI Routes',            route: '/deploy/components/data-platform/routes' },
        { id: 'dc-dp-auth',     title: 'Auth & IP Allowlisting',    route: '/deploy/components/data-platform/auth' },
        { id: 'dc-dp-hubspot',  title: 'HubSpot Sync Cronjob',      route: '/deploy/components/data-platform/hubspot-sync' },
        { id: 'dc-dp-helm',     title: 'Helm Chart Reference',      route: '/deploy/components/data-platform/helm' },
        { id: 'dc-dp-db',       title: 'Database Session Patterns', route: '/deploy/components/data-platform/database' },
      ],
    },
    {
      id: 'dc-automation',
      title: 'Automation Service',
      route: '/deploy/components/automation',
      children: [
        { id: 'dc-auto-overview', title: 'Overview',                    route: '/deploy/components/automation' },
        { id: 'dc-auto-source',   title: 'Source Repository Reference', route: '/deploy/components/automation/source-repo' },
        { id: 'dc-auto-helm',     title: 'Helm Chart Reference',        route: '/deploy/components/automation/helm' },
        { id: 'dc-auto-images',   title: 'Docker Image Tags',           route: '/deploy/components/automation/image-tags' },
      ],
    },
    {
      id: 'dc-image-loader',
      title: 'Image Loader',
      route: '/deploy/components/image-loader',
      children: [
        { id: 'dc-il-overview',  title: 'Overview',              route: '/deploy/components/image-loader' },
        { id: 'dc-il-daemonset', title: 'DaemonSet',             route: '/deploy/components/image-loader/daemonset' },
        { id: 'dc-il-overprov',  title: 'Node Overprovisioner',  route: '/deploy/components/image-loader/overprovisioner' },
        { id: 'dc-il-priority',  title: 'Priority Class',        route: '/deploy/components/image-loader/priority-class' },
        { id: 'dc-il-helm',      title: 'Helm Chart Reference',  route: '/deploy/components/image-loader/helm' },
      ],
    },
    {
      id: 'dc-error-page',
      title: 'Error Page',
      route: '/deploy/components/error-page',
      children: [
        { id: 'dc-ep-overview', title: 'Overview',             route: '/deploy/components/error-page' },
        { id: 'dc-ep-helm',     title: 'Helm Chart Reference', route: '/deploy/components/error-page/helm' },
      ],
    },
    {
      id: 'dc-keycloak',
      title: 'Keycloak',
      route: '/deploy/components/keycloak',
      children: [
        { id: 'dc-kc-overview', title: 'Overview',             route: '/deploy/components/keycloak' },
        { id: 'dc-kc-envs',     title: 'Environment Configs',  route: '/deploy/components/keycloak/envs' },
      ],
    },
    {
      id: 'dc-grafana',
      title: 'Grafana',
      route: '/deploy/components/grafana',
      children: [
        { id: 'dc-gf-overview', title: 'Overview',            route: '/deploy/components/grafana' },
        { id: 'dc-gf-envs',     title: 'Environment Configs', route: '/deploy/components/grafana/envs' },
      ],
    },
    {
      id: 'dc-runtime-api',
      title: 'Runtime API',
      route: '/deploy/components/runtime-api',
      children: [
        { id: 'dc-ra-overview', title: 'Overview',                     route: '/deploy/components/runtime-api' },
        { id: 'dc-ra-warm',     title: 'Warm Runtimes Configuration',  route: '/deploy/components/runtime-api/warm-runtimes' },
      ],
    },
  ],

  environments: [
    { id: 'env-overview', title: 'Environments Overview', route: '/deploy/environments' },
    {
      id: 'env-feature',
      title: 'Feature Environments',
      route: '/deploy/environments/feature',
      children: [
        { id: 'env-feat-what',      title: 'What They Are',              route: '/deploy/environments/feature' },
        { id: 'env-feat-trigger',   title: 'How They Are Created',       route: '/deploy/environments/feature/trigger' },
        { id: 'env-feat-namespace', title: 'Namespace Naming Convention', route: '/deploy/environments/feature/namespace' },
        { id: 'env-feat-access',    title: 'Accessing a Feature Env',    route: '/deploy/environments/feature/access' },
      ],
    },
    {
      id: 'env-staging',
      title: 'Staging',
      route: '/deploy/environments/staging',
      children: [
        { id: 'env-stg-deploy', title: 'How to Deploy to Staging', route: '/deploy/environments/staging/deploy' },
        { id: 'env-stg-diff',   title: 'Difference from Feature',  route: '/deploy/environments/staging/vs-feature' },
        { id: 'env-stg-urls',   title: 'URLs',                     route: '/deploy/environments/staging/urls' },
      ],
    },
    {
      id: 'env-production',
      title: 'Production',
      route: '/deploy/environments/production',
      children: [
        { id: 'env-prod-tags',    title: 'How Tags Trigger Production', route: '/deploy/environments/production/tag-trigger' },
        { id: 'env-prod-release', title: 'Release Branch Strategy',     route: '/deploy/environments/production/release-branch' },
        { id: 'env-prod-urls',    title: 'URLs',                        route: '/deploy/environments/production/urls' },
      ],
    },
    {
      id: 'env-evaluation',
      title: 'Evaluation Environment',
      route: '/deploy/environments/evaluation',
      children: [
        { id: 'env-eval-overview', title: 'Overview & Purpose', route: '/deploy/environments/evaluation' },
      ],
    },
  ],

  'release-and-deploy': [
    {
      id: 'rd-overview',
      title: 'Deployment Overview',
      route: '/deploy/release',
      children: [
        { id: 'rd-flow',          title: 'Release Flow',              route: '/deploy/release/flow' },
        { id: 'rd-shas',          title: 'SHA & Version Variables',   route: '/deploy/release/sha-versions' },
        { id: 'rd-commit-update', title: 'Updating a Commit Reference', route: '/deploy/release/update-commit' },
      ],
    },
    {
      id: 'rd-openhands',
      title: 'Deploying the OpenHands App',
      route: '/deploy/release/openhands',
      children: [
        { id: 'rd-oh-feature',  title: 'Feature Deployment',     route: '/deploy/release/openhands/feature' },
        { id: 'rd-oh-staging',  title: 'Staging Deployment',     route: '/deploy/release/openhands/staging' },
        { id: 'rd-oh-prod',     title: 'Production Deployment',  route: '/deploy/release/openhands/production' },
      ],
    },
    { id: 'rd-data-platform', title: 'Deploying the Data Platform',     route: '/deploy/release/data-platform' },
    { id: 'rd-automation',    title: 'Deploying the Automation Service', route: '/deploy/release/automation' },
    { id: 'rd-error-page',    title: 'Deploying the Error Page',         route: '/deploy/release/error-page' },
    { id: 'rd-grafana',       title: 'Deploying Grafana',                route: '/deploy/release/grafana' },
    { id: 'rd-eval-runtime',  title: 'Deploying the Eval Runtime',       route: '/deploy/release/eval-runtime' },
    {
      id: 'rd-helm',
      title: 'Helm Usage',
      route: '/deploy/release/helm',
      children: [
        { id: 'rd-helm-install',  title: 'Install vs. Upgrade',          route: '/deploy/release/helm/install-upgrade' },
        { id: 'rd-helm-values',   title: 'Passing Environment Values',   route: '/deploy/release/helm/env-values' },
        { id: 'rd-helm-version',  title: 'Chart Version Pinning',        route: '/deploy/release/helm/chart-version' },
      ],
    },
  ],

  'secrets-and-ops': [
    {
      id: 'so-overview',
      title: 'Secrets Management Overview',
      route: '/deploy/secrets',
      children: [
        { id: 'so-sops',  title: 'SOPS Encryption',                    route: '/deploy/secrets/sops' },
        { id: 'so-kms',   title: 'GCP KMS Key Reference',              route: '/deploy/secrets/kms' },
        { id: 'so-rule',  title: 'Never Edit Encrypted Files Manually', route: '/deploy/secrets/edit-rule' },
      ],
    },
    {
      id: 'so-encrypt',
      title: 'Encrypting & Decrypting',
      route: '/deploy/secrets/encrypt-decrypt',
      children: [
        { id: 'so-decrypt',     title: 'scripts/decrypt.sh',            route: '/deploy/secrets/decrypt' },
        { id: 'so-encrypt-sh',  title: 'scripts/encrypt.sh',            route: '/deploy/secrets/encrypt' },
        { id: 'so-safe-apply',  title: 'scripts/safe-apply-secrets.sh', route: '/deploy/secrets/safe-apply' },
      ],
    },
    {
      id: 'so-by-component',
      title: 'Secrets by Component',
      route: '/deploy/secrets/by-component',
      children: [
        { id: 'so-oh-secrets', title: 'OpenHands App Secrets',   route: '/deploy/secrets/by-component/openhands' },
        { id: 'so-dp-secrets', title: 'Data Platform Secrets',   route: '/deploy/secrets/by-component/data-platform' },
        { id: 'so-kc-secrets', title: 'Keycloak Secrets',        route: '/deploy/secrets/by-component/keycloak' },
      ],
    },
    { id: 'so-add-rotate',  title: 'Adding / Rotating a Secret',        route: '/deploy/secrets/add-rotate' },
    { id: 'so-ip-allowlist',title: 'IP Allowlisting (Data Platform)',    route: '/deploy/secrets/ip-allowlist' },
    {
      id: 'so-helm-values',
      title: 'Helm Values Configuration',
      route: '/deploy/secrets/helm-values',
      children: [
        { id: 'so-hv-per-env',  title: 'values.yaml Per Environment',    route: '/deploy/secrets/helm-values/per-env' },
        { id: 'so-hv-env-vars', title: 'Environment Variables Reference', route: '/deploy/secrets/helm-values/env-vars' },
        { id: 'so-hv-waitlist', title: 'User Waitlist Option',            route: '/deploy/secrets/helm-values/waitlist' },
      ],
    },
    {
      id: 'so-local',
      title: 'Local Secrets',
      route: '/deploy/secrets/local',
      children: [
        { id: 'so-local-decrypt',  title: 'local/decrypt_env.sh',    route: '/deploy/secrets/local/decrypt-env' },
        { id: 'so-local-convert',  title: 'local/convert_to_env.py', route: '/deploy/secrets/local/convert-to-env' },
      ],
    },
  ],

  'deploy-testing': [
    { id: 'dt-overview', title: 'Testing Overview', route: '/deploy/testing' },
    {
      id: 'dt-e2e',
      title: 'E2E Tests',
      route: '/deploy/testing/e2e',
      children: [
        { id: 'dt-e2e-overview', title: 'Overview & Tech Stack',       route: '/deploy/testing/e2e' },
        { id: 'dt-e2e-prereqs',  title: 'Prerequisites & Installation', route: '/deploy/testing/e2e/prereqs' },
        { id: 'dt-e2e-config',   title: 'Configuration',               route: '/deploy/testing/e2e/config' },
        { id: 'dt-e2e-auth',     title: 'Authentication Methods',      route: '/deploy/testing/e2e/auth' },
        { id: 'dt-e2e-run',      title: 'Running Tests',               route: '/deploy/testing/e2e/run' },
        { id: 'dt-e2e-envs',     title: 'Environments',                route: '/deploy/testing/e2e/environments' },
        { id: 'dt-e2e-pom',      title: 'Page Object Models',          route: '/deploy/testing/e2e/page-objects' },
        { id: 'dt-e2e-tags',     title: 'Test Tags',                   route: '/deploy/testing/e2e/tags' },
        { id: 'dt-e2e-ci',       title: 'CI/CD Integration',           route: '/deploy/testing/e2e/ci' },
      ],
    },
    {
      id: 'dt-automation',
      title: 'Automation Integration Tests',
      route: '/deploy/testing/automation',
      children: [
        { id: 'dt-auto-overview',  title: 'Overview',                         route: '/deploy/testing/automation' },
        { id: 'dt-auto-prereqs',   title: 'Prerequisites',                    route: '/deploy/testing/automation/prereqs' },
        { id: 'dt-auto-run',       title: 'Running (Sequential vs. Parallel)', route: '/deploy/testing/automation/run' },
        { id: 'dt-auto-crud',      title: 'test_automation_api.py',           route: '/deploy/testing/automation/crud' },
        { id: 'dt-auto-upload',    title: 'test_upload_api.py',               route: '/deploy/testing/automation/upload' },
        { id: 'dt-auto-dispatch',  title: 'test_e2e_dispatch.py',             route: '/deploy/testing/automation/dispatch' },
        { id: 'dt-auto-timeout',   title: 'test_e2e_timeout.py',              route: '/deploy/testing/automation/timeout' },
        { id: 'dt-auto-preset',    title: 'test_preset_prompt_api.py',        route: '/deploy/testing/automation/preset-prompt' },
      ],
    },
    {
      id: 'dt-data-platform',
      title: 'Data Platform Unit Tests',
      route: '/deploy/testing/data-platform',
      children: [
        { id: 'dt-dp-run',     title: 'Running the Tests',       route: '/deploy/testing/data-platform/run' },
        { id: 'dt-dp-modules', title: 'Test Modules Reference',  route: '/deploy/testing/data-platform/modules' },
      ],
    },
    {
      id: 'dt-hubspot',
      title: 'HubSpot Sync Unit Tests',
      route: '/deploy/testing/hubspot-sync',
      children: [
        { id: 'dt-hs-run', title: 'Running the Tests', route: '/deploy/testing/hubspot-sync/run' },
      ],
    },
    {
      id: 'dt-conv-mgr',
      title: 'Clustered Conversation Manager Tests',
      route: '/deploy/testing/conversation-manager',
      children: [
        { id: 'dt-cm-setup',   title: 'Test Environment Setup', route: '/deploy/testing/conversation-manager/setup' },
        { id: 'dt-cm-terms',   title: 'Terminology',            route: '/deploy/testing/conversation-manager/terminology' },
        { id: 'dt-cm-cases',   title: 'All 14 Test Cases',      route: '/deploy/testing/conversation-manager/cases' },
        { id: 'dt-cm-trouble', title: 'Troubleshooting',        route: '/deploy/testing/conversation-manager/troubleshooting' },
      ],
    },
  ],

  'cicd-reference': [
    { id: 'cicd-overview',    title: 'Workflows Overview',                       route: '/deploy/cicd' },
    { id: 'cicd-deploy',      title: 'deploy.yaml — Main Deploy',                route: '/deploy/cicd/deploy' },
    { id: 'cicd-k8s',         title: '_k8s_deploy.yaml — Reusable K8s Deploy',   route: '/deploy/cicd/k8s-deploy' },
    { id: 'cicd-docker',      title: '_docker_push.yaml — Docker Build & Push',  route: '/deploy/cicd/docker-push' },
    { id: 'cicd-e2e',         title: '_e2e.yaml — Reusable E2E Tests',           route: '/deploy/cicd/e2e' },
    { id: 'cicd-data-api',    title: 'deploy-data-api.yaml',                     route: '/deploy/cicd/deploy-data-api' },
    { id: 'cicd-automation',  title: 'deploy-automation.yaml',                   route: '/deploy/cicd/deploy-automation' },
    { id: 'cicd-error-page',  title: 'deploy-error-page.yaml',                   route: '/deploy/cicd/deploy-error-page' },
    { id: 'cicd-grafana',     title: 'deploy-grafana.yaml',                      route: '/deploy/cicd/deploy-grafana' },
    { id: 'cicd-eval',        title: 'deploy-eval-runtime.yaml',                 route: '/deploy/cicd/deploy-eval-runtime' },
    { id: 'cicd-auto-tests',  title: 'automation-integration-tests.yaml',        route: '/deploy/cicd/automation-integration-tests' },
    { id: 'cicd-run-e2e',     title: 'run_e2e_tests.yaml',                       route: '/deploy/cicd/run-e2e-tests' },
    { id: 'cicd-chart-check', title: 'chart-version-check.yaml',                 route: '/deploy/cicd/chart-version-check' },
    { id: 'cicd-commit-check',title: 'latest-commit-check.yaml',                 route: '/deploy/cicd/latest-commit-check' },
    { id: 'cicd-preview-pr',  title: 'create-openhands-preview-pr.yaml',         route: '/deploy/cicd/preview-pr' },
    { id: 'cicd-stale',       title: 'close-stale-ohpr.yml',                     route: '/deploy/cicd/close-stale' },
    { id: 'cicd-lint',        title: 'lint.yml — Python Linting',                route: '/deploy/cicd/lint' },
    { id: 'cicd-unit',        title: 'py-unit-tests.yml — Python Unit Tests',    route: '/deploy/cicd/unit-tests' },
  ],

  'deploy-dev-guide': [
    {
      id: 'ddg-setup',
      title: 'Dev Setup',
      route: '/deploy/dev-guide',
      children: [
        { id: 'ddg-prereqs', title: 'Prerequisites',                          route: '/deploy/dev-guide/prereqs' },
        { id: 'ddg-clone',   title: 'Cloning (deploy + OpenHands sibling)',   route: '/deploy/dev-guide/clone' },
        { id: 'ddg-install', title: 'poetry install',                         route: '/deploy/dev-guide/install' },
        { id: 'ddg-build',   title: 'make build',                             route: '/deploy/dev-guide/build' },
      ],
    },
    {
      id: 'ddg-run',
      title: 'Running Locally',
      route: '/deploy/dev-guide/run',
      children: [
        { id: 'ddg-run-all',     title: 'make run (backend + frontend)',       route: '/deploy/dev-guide/run/all' },
        { id: 'ddg-run-backend', title: 'make start-backend',                  route: '/deploy/dev-guide/run/backend' },
        { id: 'ddg-run-config',  title: 'Backend Config & VS Code Launch',    route: '/deploy/dev-guide/run/config' },
        { id: 'ddg-run-creds',   title: 'LiteLLM / GitHub App Credentials',   route: '/deploy/dev-guide/run/credentials' },
      ],
    },
    {
      id: 'ddg-lint',
      title: 'Code Style & Linting',
      route: '/deploy/dev-guide/lint',
      children: [
        { id: 'ddg-lint-precommit', title: 'Pre-commit (ruff, mypy)', route: '/deploy/dev-guide/lint/pre-commit' },
        { id: 'ddg-lint-run',       title: 'Running pre-commit',      route: '/deploy/dev-guide/lint/run' },
        { id: 'ddg-lint-fix',       title: 'Fixing Lint Errors',      route: '/deploy/dev-guide/lint/fix' },
      ],
    },
    { id: 'ddg-branches',       title: 'Branch Naming (< 20 chars)',               route: '/deploy/dev-guide/branch-naming' },
    {
      id: 'ddg-db',
      title: 'Database Patterns',
      route: '/deploy/dev-guide/database',
      children: [
        { id: 'ddg-db-session',      title: 'session_maker vs. a_session_maker', route: '/deploy/dev-guide/database/session-makers' },
        { id: 'ddg-db-async',        title: 'call_sync_from_async Pattern',      route: '/deploy/dev-guide/database/async-pattern' },
        { id: 'ddg-db-antipatterns', title: 'Anti-patterns to Avoid',            route: '/deploy/dev-guide/database/antipatterns' },
      ],
    },
    { id: 'ddg-update-commit', title: 'Updating the OpenHands Commit (3 locations)', route: '/deploy/dev-guide/update-commit' },
    {
      id: 'ddg-pr',
      title: 'PR Process',
      route: '/deploy/dev-guide/pr-process',
      children: [
        { id: 'ddg-pr-secrets-rule', title: 'Secrets Rule (never modify secrets/)', route: '/deploy/dev-guide/pr-process/secrets-rule' },
        { id: 'ddg-pr-chart-check',  title: 'Chart Version Check',                  route: '/deploy/dev-guide/pr-process/chart-check' },
      ],
    },
  ],
};
