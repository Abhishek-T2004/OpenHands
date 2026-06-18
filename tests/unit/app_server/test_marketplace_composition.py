"""Tests for marketplace composition logic in settings_router."""

from __future__ import annotations

import os


# Inline implementation for testing without FastAPI imports
def _get_instance_default_marketplaces() -> list[dict]:
    """Get instance-level default marketplaces from environment variable.

    Format: comma-separated list of marketplace definitions
    Each definition: source[#name[#ref[#repo_path]]]
    Example: github:openhands/extensions#default#main#marketplaces/default
    Or JSON-encoded: [{"source":"github:...","name":"...","ref":"..."}]
    """
    import json

    env_value = os.environ.get('INSTANCE_DEFAULT_MARKETPLACES', '')
    if not env_value:
        return []

    marketplaces = []
    for definition in env_value.split(','):
        definition = definition.strip()
        if not definition:
            continue

        # Try JSON format first
        if definition.startswith('[') or definition.startswith('{'):
            try:
                parsed = json.loads(definition)
                if isinstance(parsed, list):
                    for mp in parsed:
                        marketplaces.append({**mp, 'auto_load': mp.get('auto_load', 'all')})
                elif isinstance(parsed, dict):
                    marketplaces.append({**parsed, 'auto_load': parsed.get('auto_load', 'all')})
                continue
            except json.JSONDecodeError:
                pass

        # Parse key=value format
        # source#name#ref#repo_path or source=name,ref,repo_path
        parts = definition.split('#')
        source = parts[0]

        marketplace = {'source': source}
        if len(parts) > 1 and parts[1]:
            marketplace['name'] = parts[1]
        if len(parts) > 2 and parts[2]:
            marketplace['ref'] = parts[2]
        if len(parts) > 3 and parts[3]:
            marketplace['repo_path'] = parts[3]
        marketplace['auto_load'] = 'all'

        marketplaces.append(marketplace)

    return marketplaces


def _merge_marketplaces(
    instance_marketplaces: list[dict],
    org_marketplaces: list[dict],
    user_marketplaces: list[dict],
) -> tuple[list[dict], list[dict]]:
    """Merge marketplaces from different scopes with proper precedence.

    Composition order (additive): Instance -> Org -> User
    Each level can add more marketplaces, but user overrides earlier definitions.

    Args:
        instance_marketplaces: From INSTANCE_DEFAULT_MARKETPLACES env var
        org_marketplaces: From org extension_settings
        user_marketplaces: From user registered_marketplaces

    Returns:
        Tuple of (inherited_marketplaces, personal_marketplaces)
        inherited_marketplaces includes instance + org (read-only)
        personal_marketplaces is user-defined (editable)
    """
    inherited: list[dict] = []
    personal: list[dict] = []

    # Build lookup by source for deduplication
    # User settings take precedence over org, org over instance
    seen_sources: set[str] = set()

    # Instance defaults first (lowest priority)
    for mp in instance_marketplaces:
        source = mp.get('source', '')
        if source and source not in seen_sources:
            inherited.append({**mp, 'scope': 'instance'})
            seen_sources.add(source)

    # Org settings (override instance)
    for mp in org_marketplaces:
        source = mp.get('source', '')
        if source and source not in seen_sources:
            inherited.append({**mp, 'scope': 'org'})
            seen_sources.add(source)
        elif source in seen_sources:
            # Override: update existing with org values
            for i, imp in enumerate(inherited):
                if imp.get('source') == source:
                    inherited[i] = {**imp, **mp, 'scope': 'org'}
                    break

    # User settings (highest priority) - these go to personal list
    for mp in user_marketplaces:
        source = mp.get('source', '')
        if source and source not in seen_sources:
            personal.append({**mp, 'scope': 'personal'})
            seen_sources.add(source)
        else:
            # User is modifying an existing marketplace - add to personal
            # and mark as overridden in inherited
            personal.append({**mp, 'scope': 'personal'})
            # Update inherited to show user override
            for i, imp in enumerate(inherited):
                if imp.get('source') == source:
                    inherited[i] = {**imp, **mp, 'scope': 'personal', 'overridden': True}
                    break

    return inherited, personal


class TestGetInstanceDefaultMarketplaces:
    """Tests for parsing INSTANCE_DEFAULT_MARKETPLACES environment variable."""

    def test_empty_env_var(self, monkeypatch):
        """Test that empty env var returns empty list."""
        monkeypatch.setenv('INSTANCE_DEFAULT_MARKETPLACES', '')
        result = _get_instance_default_marketplaces()
        assert result == []

    def test_unset_env_var(self, monkeypatch):
        """Test that unset env var returns empty list."""
        monkeypatch.delenv('INSTANCE_DEFAULT_MARKETPLACES', raising=False)
        result = _get_instance_default_marketplaces()
        assert result == []

    def test_single_marketplace(self, monkeypatch):
        """Test parsing a single marketplace definition."""
        monkeypatch.setenv('INSTANCE_DEFAULT_MARKETPLACES', 'github:OpenHands/skills')
        result = _get_instance_default_marketplaces()
        assert len(result) == 1
        assert result[0]['source'] == 'github:OpenHands/skills'
        assert result[0]['auto_load'] == 'all'

    def test_marketplace_with_name(self, monkeypatch):
        """Test parsing marketplace with custom name using # separator."""
        monkeypatch.setenv(
            'INSTANCE_DEFAULT_MARKETPLACES', 'github:OpenHands/skills#my-marketplace'
        )
        result = _get_instance_default_marketplaces()
        assert len(result) == 1
        assert result[0]['source'] == 'github:OpenHands/skills'
        assert result[0]['name'] == 'my-marketplace'

    def test_marketplace_with_all_fields(self, monkeypatch):
        """Test parsing marketplace with all fields using # separator."""
        monkeypatch.setenv(
            'INSTANCE_DEFAULT_MARKETPLACES',
            'github:OpenHands/extensions#my-market#main#marketplaces/plugins',
        )
        result = _get_instance_default_marketplaces()
        assert len(result) == 1
        assert result[0]['source'] == 'github:OpenHands/extensions'
        assert result[0]['name'] == 'my-market'
        assert result[0]['ref'] == 'main'
        assert result[0]['repo_path'] == 'marketplaces/plugins'

    def test_multiple_marketplaces(self, monkeypatch):
        """Test parsing multiple comma-separated marketplaces."""
        monkeypatch.setenv(
            'INSTANCE_DEFAULT_MARKETPLACES',
            'github:OpenHands/skills,github:myorg/plugins',
        )
        result = _get_instance_default_marketplaces()
        assert len(result) == 2
        assert result[0]['source'] == 'github:OpenHands/skills'
        assert result[1]['source'] == 'github:myorg/plugins'

    def test_whitespace_handling(self, monkeypatch):
        """Test that whitespace is trimmed."""
        monkeypatch.setenv(
            'INSTANCE_DEFAULT_MARKETPLACES',
            '  github:OpenHands/skills  ,  github:myorg/plugins  ',
        )
        result = _get_instance_default_marketplaces()
        assert len(result) == 2
        assert result[0]['source'] == 'github:OpenHands/skills'
        assert result[1]['source'] == 'github:myorg/plugins'

    def test_empty_parts_ignored(self, monkeypatch):
        """Test that empty parts after # separator are ignored."""
        monkeypatch.setenv(
            'INSTANCE_DEFAULT_MARKETPLACES',
            'github:OpenHands/skills##v2#marketplaces/plugins',
        )
        result = _get_instance_default_marketplaces()
        assert len(result) == 1
        assert result[0]['source'] == 'github:OpenHands/skills'
        assert result[0]['ref'] == 'v2'
        assert result[0]['repo_path'] == 'marketplaces/plugins'
        assert 'name' not in result[0]


class TestMergeMarketplaces:
    """Tests for marketplace composition logic."""

    def test_empty_all(self):
        """Test composition with all empty lists."""
        inherited, personal = _merge_marketplaces([], [], [])
        assert inherited == []
        assert personal == []

    def test_only_instance_defaults(self):
        """Test composition with only instance defaults."""
        instance = [
            {'source': 'github:OpenHands/skills', 'auto_load': 'all'},
            {'source': 'github:myorg/plugins', 'name': 'my-plugins'},
        ]
        inherited, personal = _merge_marketplaces(instance, [], [])
        assert len(inherited) == 2
        assert all(mp.get('scope') == 'instance' for mp in inherited)
        assert personal == []

    def test_instance_and_org(self):
        """Test composition with instance and org marketplaces."""
        instance = [{'source': 'github:OpenHands/skills', 'auto_load': 'all'}]
        org = [{'source': 'github:myorg/plugins', 'name': 'my-plugins'}]
        inherited, personal = _merge_marketplaces(instance, org, [])
        assert len(inherited) == 2
        assert inherited[0]['source'] == 'github:OpenHands/skills'
        assert inherited[0]['scope'] == 'instance'
        assert inherited[1]['source'] == 'github:myorg/plugins'
        assert inherited[1]['scope'] == 'org'
        assert personal == []

    def test_org_overrides_instance(self):
        """Test that org settings override instance settings for same source."""
        instance = [
            {'source': 'github:OpenHands/skills', 'ref': 'main', 'auto_load': 'all'}
        ]
        org = [
            {'source': 'github:OpenHands/skills', 'ref': 'v2', 'auto_load': None}
        ]
        inherited, personal = _merge_marketplaces(instance, org, [])
        assert len(inherited) == 1
        # Org should override instance values
        assert inherited[0]['ref'] == 'v2'
        assert inherited[0]['scope'] == 'org'

    def test_user_adds_new_marketplace(self):
        """Test that user can add new marketplace."""
        instance = [{'source': 'github:OpenHands/skills', 'auto_load': 'all'}]
        user = [
            {'source': 'github:myorg/plugins', 'name': 'my-plugins', 'auto_load': 'all'}
        ]
        inherited, personal = _merge_marketplaces(instance, [], user)
        assert len(inherited) == 1
        assert inherited[0]['source'] == 'github:OpenHands/skills'
        assert len(personal) == 1
        assert personal[0]['source'] == 'github:myorg/plugins'
        assert personal[0]['scope'] == 'personal'

    def test_user_overrides_instance(self):
        """Test that user can override an instance marketplace."""
        instance = [
            {'source': 'github:OpenHands/skills', 'ref': 'main', 'auto_load': 'all'}
        ]
        user = [
            {'source': 'github:OpenHands/skills', 'ref': 'v2', 'auto_load': None}
        ]
        inherited, personal = _merge_marketplaces(instance, [], user)
        # Instance marketplace should be marked as overridden
        assert len(inherited) == 1
        assert inherited[0]['source'] == 'github:OpenHands/skills'
        assert inherited[0]['scope'] == 'personal'
        assert inherited[0]['overridden'] is True
        # User's version should be in personal
        assert len(personal) == 1
        assert personal[0]['ref'] == 'v2'
        assert personal[0]['scope'] == 'personal'

    def test_user_overrides_org(self):
        """Test that user can override an org marketplace."""
        org = [
            {'source': 'github:myorg/plugins', 'ref': 'main', 'auto_load': 'all'}
        ]
        user = [
            {'source': 'github:myorg/plugins', 'ref': 'v2', 'auto_load': None}
        ]
        inherited, personal = _merge_marketplaces([], org, user)
        assert len(inherited) == 1
        assert inherited[0]['source'] == 'github:myorg/plugins'
        assert inherited[0]['scope'] == 'personal'
        assert inherited[0]['overridden'] is True
        assert len(personal) == 1
        assert personal[0]['ref'] == 'v2'

    def test_full_composition(self):
        """Test full composition with instance, org, and user settings."""
        instance = [
            {'source': 'github:OpenHands/skills', 'auto_load': 'all'},
            {'source': 'github:instance/only', 'name': 'instance-only'},
        ]
        org = [
            {'source': 'github:OpenHands/skills', 'ref': 'v2'},  # override instance
            {'source': 'github:myorg/plugins', 'name': 'org-plugins'},
        ]
        user = [
            {'source': 'github:OpenHands/skills', 'ref': 'v3'},  # override org
            {'source': 'github:myorg/plugins', 'auto_load': None},  # override org
            {'source': 'github:user/custom', 'name': 'user-market'},
        ]

        inherited, personal = _merge_marketplaces(instance, org, user)

        # Check inherited marketplaces
        assert len(inherited) == 3
        inherited_by_source = {mp['source']: mp for mp in inherited}

        # github:OpenHands/skills should have user's values
        assert inherited_by_source['github:OpenHands/skills']['ref'] == 'v3'
        assert inherited_by_source['github:OpenHands/skills']['scope'] == 'personal'
        assert inherited_by_source['github:OpenHands/skills']['overridden'] is True

        # github:instance/only should still be instance-level
        assert inherited_by_source['github:instance/only']['scope'] == 'instance'
        assert 'overridden' not in inherited_by_source['github:instance/only']

        # github:myorg/plugins should have user's values
        assert inherited_by_source['github:myorg/plugins']['scope'] == 'personal'
        assert inherited_by_source['github:myorg/plugins']['overridden'] is True

        # Check personal marketplaces
        assert len(personal) == 3
        personal_by_source = {mp['source']: mp for mp in personal}

        assert personal_by_source['github:OpenHands/skills']['ref'] == 'v3'
        assert personal_by_source['github:myorg/plugins']['auto_load'] is None
        assert personal_by_source['github:user/custom']['name'] == 'user-market'

    def test_deduplication_by_source(self):
        """Test that same source from multiple levels results in single entry."""
        instance = [
            {'source': 'github:OpenHands/skills', 'ref': 'main', 'auto_load': 'all'}
        ]
        org = [
            {'source': 'github:OpenHands/skills', 'ref': 'org-branch'}
        ]
        user = [
            {'source': 'github:OpenHands/skills', 'ref': 'user-branch'}
        ]

        inherited, personal = _merge_marketplaces(instance, org, user)

        # Should only have one entry in inherited
        assert len(inherited) == 1
        # Should have user's values (highest priority)
        assert inherited[0]['ref'] == 'user-branch'
        assert inherited[0]['scope'] == 'personal'
        assert inherited[0]['overridden'] is True

        # Personal should have user's version
        assert len(personal) == 1
        assert personal[0]['ref'] == 'user-branch'
