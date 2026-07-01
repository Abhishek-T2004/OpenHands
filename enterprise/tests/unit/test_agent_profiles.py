"""Unit + integration tests for the cloud Agent Profiles surface (#15044).

Covers the ``AgentProfiles`` container (SDK ``AgentProfileStoreProtocol``
conformance), the flat ``/api/agent-profiles`` router, the LLM-profile FK guard
wired into ``org_profiles``, and ``SaasSettingsStore._resolve_active_agent_profile``.
Mirrors the harness in ``test_org_profiles.py``: handlers are called directly
(``Depends`` resolved as kwargs) against a real SQLite Org row.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from storage.org import Org
from storage.org_member import OrgMember
from storage.role import Role
from storage.user import User

from openhands.app_server.settings.agent_profiles import (
    MAX_AGENT_PROFILES,
    AgentProfiles,
)
from openhands.app_server.settings.llm_profiles import LLMProfiles
from openhands.sdk.llm import LLM
from openhands.sdk.profiles import (
    ACPAgentProfile,
    AgentProfileStoreProtocol,
    OpenHandsAgentProfile,
    save_profile_preserving_identity,
)

# Mock the database module before importing the routers so module-level imports
# don't touch a real engine (matches test_org_profiles.py).
with patch('storage.database.a_session_maker'):
    from server.routes.agent_profiles import (
        ActivateAgentProfileResponse,
        AgentProfileListResponse,
        RenameAgentProfileRequest,
        activate_agent_profile,
        delete_agent_profile,
        get_agent_profile,
        list_agent_profiles,
        materialize_agent_profile,
        rename_agent_profile,
        save_agent_profile,
    )
    from server.routes.org_profiles import (
        RenameProfileRequest,
        delete_profile,
        rename_profile,
    )
    from storage.agent_profile_resolution import load_agent_profiles

ORG_ID = uuid.UUID('6694c7b6-f959-4b81-92e9-b09c206f5081')
USER_ID = uuid.UUID('6694c7b6-f959-4b81-92e9-b09c206f5082')


# ── Container model ────────────────────────────────────────────────────────


class TestAgentProfilesContainer:
    def test_conforms_to_sdk_protocol(self):
        assert isinstance(AgentProfiles(), AgentProfileStoreProtocol)
        assert MAX_AGENT_PROFILES == 50

    def test_id_lifecycle_and_name_keyed_protocol_ops(self):
        store = AgentProfiles()
        created = save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='reviewer', llm_profile_ref='gpt')
        )
        assert created.revision == 0
        # overwrite keeps id, bumps revision; create mints a fresh id
        again = save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='reviewer', llm_profile_ref='haiku')
        )
        assert again.id == created.id and again.revision == 1
        assert store.load('reviewer').llm_profile_ref == 'haiku'
        assert store.name_for_id(created.id) == 'reviewer'

        save_profile_preserving_identity(
            store, ACPAgentProfile(name='claude', acp_server='claude-code')
        )
        summaries = {s['name']: s for s in store.list_summaries()}
        assert summaries['reviewer']['llm_profile_ref'] == 'haiku'
        assert summaries['claude']['llm_profile_ref'] is None  # ACP carries no ref

    def test_rename_preserves_id_and_active_pointer(self):
        store = AgentProfiles()
        p = save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='a', llm_profile_ref='gpt')
        )
        store.active = str(p.id)
        store.rename('a', 'b')
        assert store.name_for_id(p.id) == 'b'
        assert store.active == str(p.id)  # id-keyed pointer survives rename
        with pytest.raises(FileNotFoundError):
            store.load('a')

    def test_delete_clears_org_active_pointer(self):
        store = AgentProfiles()
        p = save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='a', llm_profile_ref='gpt')
        )
        store.active = str(p.id)
        store.delete('a')
        assert store.active is None

    def test_limit_enforced(self):
        store = AgentProfiles()
        for i in range(MAX_AGENT_PROFILES):
            save_profile_preserving_identity(
                store, OpenHandsAgentProfile(name=f'p{i}', llm_profile_ref='gpt')
            )
        from openhands.sdk.profiles import ProfileLimitExceeded

        with pytest.raises(ProfileLimitExceeded):
            save_profile_preserving_identity(
                store,
                OpenHandsAgentProfile(name='over', llm_profile_ref='gpt'),
                max_profiles=MAX_AGENT_PROFILES,
            )

    def test_encrypted_json_roundtrip_via_dict(self):
        store = AgentProfiles()
        save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='r', llm_profile_ref='gpt')
        )
        dumped = store.model_dump(mode='json', context={'expose_secrets': True})
        reloaded = AgentProfiles.model_validate(dumped)
        assert reloaded.load('r').llm_profile_ref == 'gpt'

    def test_invalid_entry_is_skipped_not_fatal(self):
        store = AgentProfiles.model_validate(
            {'profiles': {'bad': {'agent_kind': 'nonsense'}}, 'active': None}
        )
        assert store.list_summaries() == []


def test_load_agent_profiles_defaults_empty_and_degrades():
    org = MagicMock(spec=Org)
    org.id = ORG_ID
    org.agent_profiles = None
    assert load_agent_profiles(org).list_summaries() == []
    # Garbage envelope degrades to empty rather than raising.
    org.agent_profiles = {'profiles': 'not-a-dict'}
    assert load_agent_profiles(org).list_summaries() == []


# ── Router integration (real Org row over SQLite) ──────────────────────────


@pytest.fixture
def seeded_org(session_maker):
    with session_maker() as session:
        session.add(Role(id=20, name='member', rank=3))
        session.add(
            Org(
                id=ORG_ID,
                name='agent-profile-test-org',
                org_version=1,
                enable_proactive_conversation_starters=True,
                # An LLM profile the seed/resolve can reference.
                llm_profiles={
                    'profiles': {'Default': {'model': 'gpt-4o', 'api_key': 'k'}},
                    'active': 'Default',
                },
            )
        )
        session.add(
            User(id=USER_ID, current_org_id=ORG_ID, user_consents_to_analytics=True)
        )
        session.add(
            OrgMember(
                org_id=ORG_ID,
                user_id=USER_ID,
                role_id=20,
                llm_api_key='initial-key',
                agent_settings_diff={},
                conversation_settings_diff={},
                status='active',
            )
        )
        session.commit()
    return ORG_ID


@pytest.fixture
def patch_agent_routes(async_session_maker, seeded_org):
    async def _fake_get_org(org_id, user_id):  # noqa: ARG001
        async with async_session_maker() as session:
            result = await session.execute(select(Org).where(Org.id == org_id))
            return result.scalars().first()

    with (
        patch('server.routes.agent_profiles.a_session_maker', async_session_maker),
        patch(
            'server.routes.agent_profiles.OrgService.get_org_by_id',
            side_effect=_fake_get_org,
        ),
    ):
        yield seeded_org


async def _read_member(async_session_maker, org_id, user_id):
    async with async_session_maker() as session:
        result = await session.execute(
            select(OrgMember).where(
                OrgMember.org_id == org_id, OrgMember.user_id == user_id
            )
        )
        return result.scalars().first()


class TestAgentProfileRouterLifecycle:
    @pytest.mark.asyncio
    async def test_save_list_get_rename_activate_delete(
        self, async_session_maker, patch_agent_routes
    ):
        org_id = patch_agent_routes
        uid = str(USER_ID)

        # save (create)
        await save_agent_profile(
            name='reviewer',
            body={'llm_profile_ref': 'Default'},
            effective_org_id=org_id,
            user_id=uid,
        )
        # list shows it
        listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)
        assert [p.name for p in listing.profiles] == ['reviewer']
        profile_id = listing.profiles[0].id
        assert profile_id is not None
        assert listing.profiles[0].llm_profile_ref == 'Default'

        # get detail (profile is the typed discriminated union, not a dict)
        detail = await get_agent_profile(
            name='reviewer', effective_org_id=org_id, user_id=uid
        )
        assert detail.profile.agent_kind == 'openhands'
        assert detail.profile.llm_profile_ref == 'Default'

        # overwrite bumps revision, keeps id
        await save_agent_profile(
            name='reviewer',
            body={'llm_profile_ref': 'Default', 'tool_concurrency_limit': 3},
            effective_org_id=org_id,
            user_id=uid,
        )
        listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)
        assert listing.profiles[0].id == profile_id
        assert listing.profiles[0].revision == 1

        # rename preserves id
        await rename_agent_profile(
            name='reviewer',
            request=RenameAgentProfileRequest(new_name='lead-reviewer'),
            effective_org_id=org_id,
            user_id=uid,
        )
        listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)
        assert listing.profiles[0].name == 'lead-reviewer'
        assert listing.profiles[0].id == profile_id

        # activate writes the per-member pointer (pointer-only)
        resp = await activate_agent_profile(
            profile_id=profile_id, effective_org_id=org_id, user_id=uid
        )
        assert isinstance(resp, ActivateAgentProfileResponse)
        assert resp.agent_settings_applied is False
        member = await _read_member(async_session_maker, org_id, USER_ID)
        assert member.active_agent_profile_id == profile_id

        # delete clears the pointer
        await delete_agent_profile(
            name='lead-reviewer', effective_org_id=org_id, user_id=uid
        )
        member = await _read_member(async_session_maker, org_id, USER_ID)
        assert member.active_agent_profile_id is None
        # Read the row directly (calling list here would lazily re-seed a default).
        async with async_session_maker() as session:
            org = (
                (await session.execute(select(Org).where(Org.id == org_id)))
                .scalars()
                .first()
            )
        assert load_agent_profiles(org).list_summaries() == []


class TestDeleteClearsAllMemberPointers:
    """Deleting a profile must clear every org member's pointer to it, not
    just the acting member's (activation is per-member)."""

    @pytest.mark.asyncio
    async def test_delete_clears_other_members_active_pointer(
        self, async_session_maker, patch_agent_routes
    ):
        org_id = patch_agent_routes
        uid = str(USER_ID)
        other_user_id = uuid.UUID('6694c7b6-f959-4b81-92e9-b09c206f5099')

        async with async_session_maker() as session:
            session.add(
                User(
                    id=other_user_id,
                    current_org_id=org_id,
                    user_consents_to_analytics=True,
                )
            )
            session.add(
                OrgMember(
                    org_id=org_id,
                    user_id=other_user_id,
                    role_id=20,
                    llm_api_key='other-initial-key',
                    agent_settings_diff={},
                    conversation_settings_diff={},
                    status='active',
                )
            )
            await session.commit()

        await save_agent_profile(
            name='shared',
            body={'llm_profile_ref': 'Default'},
            effective_org_id=org_id,
            user_id=uid,
        )
        listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)
        profile_id = listing.profiles[0].id
        assert profile_id is not None

        # Both members activate the same profile independently.
        await activate_agent_profile(
            profile_id=profile_id, effective_org_id=org_id, user_id=uid
        )
        await activate_agent_profile(
            profile_id=profile_id, effective_org_id=org_id, user_id=str(other_user_id)
        )
        other_member = await _read_member(async_session_maker, org_id, other_user_id)
        assert other_member.active_agent_profile_id == profile_id

        # The acting member deletes the profile.
        await delete_agent_profile(name='shared', effective_org_id=org_id, user_id=uid)

        acting_member = await _read_member(async_session_maker, org_id, USER_ID)
        assert acting_member.active_agent_profile_id is None
        other_member = await _read_member(async_session_maker, org_id, other_user_id)
        assert other_member.active_agent_profile_id is None, (
            "other member's pointer must be cleared too"
        )


class TestMaskedMcpSecretRestore:
    """A save that posts back a masked mcp_tools secret must not drop a
    sibling MCP server added in that same request (finding: wholesale skill
    mcp_tools revert instead of a per-server restore)."""

    @pytest.mark.asyncio
    async def test_new_server_survives_save_alongside_masked_server(
        self, async_session_maker, patch_agent_routes
    ):
        org_id = patch_agent_routes
        uid = str(USER_ID)
        skill_body = {
            'name': 'skill-a',
            'content': 'do the thing',
            'mcp_tools': {
                'mcpServers': {
                    'server-a': {
                        'command': 'server-a-bin',
                        'env': {'API_KEY': 'super-secret'},
                    }
                }
            },
        }
        await save_agent_profile(
            name='with-mcp',
            body={'llm_profile_ref': 'Default', 'skills': [skill_body]},
            effective_org_id=org_id,
            user_id=uid,
        )

        # GET masks server-a's secret with the mcp_tools-specific sentinel
        # ("<redacted>" — NOT the SecretStr "**********" sentinel).
        detail = await get_agent_profile(
            name='with-mcp', effective_org_id=org_id, user_id=uid
        )
        # Round-trip through the JSON dump the client would receive and edit.
        fetched = detail.profile.model_dump(mode='json')
        fetched_skill = fetched['skills'][0]
        assert (
            fetched_skill['mcp_tools']['mcpServers']['server-a']['env']['API_KEY']
            == '<redacted>'
        )

        # Client adds a brand-new, unmasked server alongside the masked one.
        fetched_skill['mcp_tools']['mcpServers']['server-b'] = {
            'command': 'server-b-bin',
            'env': {'OTHER_KEY': 'brand-new-secret'},
        }
        await save_agent_profile(
            name='with-mcp',
            body={
                'llm_profile_ref': 'Default',
                'skills': [fetched_skill],
            },
            effective_org_id=org_id,
            user_id=uid,
        )

        # Inspect the stored domain object directly (real values, not the
        # GET-time mask) to confirm both the restored original secret and
        # the newly-added server's secret actually persisted.
        async with async_session_maker() as session:
            org = (
                (await session.execute(select(Org).where(Org.id == org_id)))
                .scalars()
                .first()
            )
        stored = load_agent_profiles(org).load('with-mcp')
        stored_servers = stored.skills[0].mcp_tools['mcpServers']
        assert stored_servers['server-a']['env']['API_KEY'] == 'super-secret'
        assert 'server-b' in stored_servers, 'newly-added server must not be dropped'
        assert stored_servers['server-b']['env']['OTHER_KEY'] == 'brand-new-secret'


class TestAgentProfileRouterErrors:
    @pytest.mark.asyncio
    async def test_get_missing_404(self, patch_agent_routes):
        with pytest.raises(HTTPException) as exc:
            await get_agent_profile(
                name='nope', effective_org_id=patch_agent_routes, user_id=str(USER_ID)
            )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_missing_is_idempotent_200(self, patch_agent_routes):
        # A missing name resolves 200 (no raise), matching the ts-client
        # AgentProfilesClient contract and the local agent-server delete_profile.
        # Canvas's delete mutation has no 404 branch.
        resp = await delete_agent_profile(
            name='never-existed',
            effective_org_id=patch_agent_routes,
            user_id=str(USER_ID),
        )
        assert resp.name == 'never-existed'

    @pytest.mark.asyncio
    async def test_activate_unknown_id_404(self, patch_agent_routes):
        with pytest.raises(HTTPException) as exc:
            await activate_agent_profile(
                profile_id=str(uuid.uuid4()),
                effective_org_id=patch_agent_routes,
                user_id=str(USER_ID),
            )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_save_invalid_payload_422(self, patch_agent_routes):
        with pytest.raises(HTTPException) as exc:
            # cross-variant mongrel: acp_kind payload carrying llm_profile_ref
            await save_agent_profile(
                name='bad',
                body={'agent_kind': 'acp', 'llm_profile_ref': 'x'},
                effective_org_id=patch_agent_routes,
                user_id=str(USER_ID),
            )
        assert exc.value.status_code == 422

    @pytest.mark.asyncio
    async def test_materialize_dangling_llm_ref_is_invalid_not_404(
        self, patch_agent_routes
    ):
        org_id = patch_agent_routes
        uid = str(USER_ID)
        await save_agent_profile(
            name='dangler',
            body={'llm_profile_ref': 'does-not-exist'},
            effective_org_id=org_id,
            user_id=uid,
        )
        diag = await materialize_agent_profile(
            name='dangler', effective_org_id=org_id, user_id=uid
        )
        assert diag.valid is False
        assert any('does-not-exist' in e for e in diag.errors)

    @pytest.mark.asyncio
    async def test_materialize_valid_profile(self, patch_agent_routes):
        org_id = patch_agent_routes
        uid = str(USER_ID)
        await save_agent_profile(
            name='ok',
            body={'llm_profile_ref': 'Default'},
            effective_org_id=org_id,
            user_id=uid,
        )
        diag = await materialize_agent_profile(
            name='ok', effective_org_id=org_id, user_id=uid
        )
        assert diag.valid is True
        assert diag.llm_profile_resolved is True


class TestLazySeedMigration:
    @pytest.mark.asyncio
    async def test_first_list_seeds_default_and_points_member(
        self, async_session_maker, patch_agent_routes
    ):
        org_id = patch_agent_routes
        uid = str(USER_ID)

        # Stub the settings load the seed derives from.
        fake_settings = MagicMock()
        fake_settings.agent_settings.agent_kind = 'openhands'
        from openhands.sdk.settings import validate_agent_settings

        fake_settings.agent_settings = validate_agent_settings(
            {'agent_kind': 'openhands'}
        )
        fake_settings.llm_profiles = LLMProfiles(
            profiles={'Default': LLM(usage_id='u', model='gpt-4o')}, active='Default'
        )
        fake_store = MagicMock()
        fake_store.load = AsyncMock(return_value=fake_settings)

        with patch(
            'server.routes.agent_profiles.SaasSettingsStore',
            return_value=fake_store,
        ):
            listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)

        assert isinstance(listing, AgentProfileListResponse)
        assert len(listing.profiles) == 1
        assert listing.profiles[0].name == 'default'
        assert listing.profiles[0].llm_profile_ref == 'Default'
        assert listing.active_agent_profile_id == listing.profiles[0].id
        member = await _read_member(async_session_maker, org_id, USER_ID)
        assert member.active_agent_profile_id == listing.profiles[0].id

    @pytest.mark.asyncio
    async def test_list_reflects_concurrently_seeded_profile_on_race_loss(
        self, async_session_maker, patch_agent_routes
    ):
        """If this request loses the double-checked seed race,
        list_agent_profiles must still return the profile a concurrent
        request just seeded, not a stale pre-seed empty snapshot."""
        org_id = patch_agent_routes
        uid = str(USER_ID)

        store = AgentProfiles()
        winner_profile = save_profile_preserving_identity(
            store, OpenHandsAgentProfile(name='default', llm_profile_ref='Default')
        )

        # The initial read (top of list_agent_profiles) sees an empty store,
        # so it enters the seed branch. Only once _seed_default_agent_profile
        # is actually invoked does a "concurrent" request's seed land on the
        # org row — simulating the double-check losing the race — and this
        # fake returns None just like the real losing branch does.
        async def _lost_the_race(org_id, user_id):  # noqa: ARG001
            await _set_agent_profiles(async_session_maker, org_id, store)
            return None

        with patch(
            'server.routes.agent_profiles._seed_default_agent_profile',
            new=AsyncMock(side_effect=_lost_the_race),
        ):
            listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)

        assert [p.name for p in listing.profiles] == ['default']
        assert listing.profiles[0].id == str(winner_profile.id)

    @pytest.mark.asyncio
    async def test_second_member_resolves_org_default_after_seed(
        self, async_session_maker, patch_agent_routes
    ):
        """A member who never triggers (or wins) the one-time seed keeps
        getting a null active pointer from ``member.active_agent_profile_id``
        forever, since the seed gate only re-fires while ``profiles.list()``
        is empty. They must still resolve to the org-wide default the first
        member's seed set (``AgentProfiles.active``), both in the list
        response and in ``SaasSettingsStore`` resolution."""
        org_id = patch_agent_routes
        first_user_id = USER_ID
        second_user_id = uuid.UUID('6694c7b6-f959-4b81-92e9-b09c206f5099')

        async with async_session_maker() as session:
            session.add(
                User(
                    id=second_user_id,
                    current_org_id=org_id,
                    user_consents_to_analytics=True,
                )
            )
            session.add(
                OrgMember(
                    org_id=org_id,
                    user_id=second_user_id,
                    role_id=20,
                    llm_api_key='second-initial-key',
                    agent_settings_diff={},
                )
            )
            await session.commit()

        from openhands.sdk.settings import validate_agent_settings

        fake_settings = MagicMock()
        fake_settings.agent_settings = validate_agent_settings(
            {'agent_kind': 'openhands'}
        )
        fake_settings.llm_profiles = LLMProfiles(
            profiles={'Default': LLM(usage_id='u', model='gpt-4o')}, active='Default'
        )
        fake_store = MagicMock()
        fake_store.load = AsyncMock(return_value=fake_settings)

        with patch(
            'server.routes.agent_profiles.SaasSettingsStore',
            return_value=fake_store,
        ):
            winner_listing = await list_agent_profiles(
                effective_org_id=org_id, user_id=str(first_user_id)
            )
            loser_listing = await list_agent_profiles(
                effective_org_id=org_id, user_id=str(second_user_id)
            )

        assert winner_listing.active_agent_profile_id == winner_listing.profiles[0].id

        second_member = await _read_member(async_session_maker, org_id, second_user_id)
        # The loser never gets their own per-member pointer set...
        assert second_member.active_agent_profile_id is None
        # ...but the list response still resolves them to the org default.
        assert (
            loser_listing.active_agent_profile_id
            == winner_listing.active_agent_profile_id
        )


# ── FK guard wired into the LLM-profile router ─────────────────────────────


@pytest.fixture
def patch_org_profile_routes(async_session_maker, seeded_org):
    async def _fake_get_org(org_id, user_id):  # noqa: ARG001
        async with async_session_maker() as session:
            result = await session.execute(select(Org).where(Org.id == org_id))
            return result.scalars().first()

    with (
        patch('server.routes.org_profiles.a_session_maker', async_session_maker),
        patch(
            'server.routes.org_profiles.OrgService.get_org_by_id',
            side_effect=_fake_get_org,
        ),
    ):
        yield seeded_org


async def _set_agent_profiles(async_session_maker, org_id, agent_profiles):
    async with async_session_maker() as session:
        org = (
            (await session.execute(select(Org).where(Org.id == org_id)))
            .scalars()
            .first()
        )
        org.agent_profiles = agent_profiles.model_dump(
            mode='json', context={'expose_secrets': True}
        )
        await session.commit()


class TestLLMProfileFKGuard:
    @pytest.mark.asyncio
    async def test_delete_blocked_by_referencing_agent_profile(
        self, async_session_maker, patch_org_profile_routes
    ):
        org_id = patch_org_profile_routes
        # Reference the org's 'Default' LLM profile from an agent profile.
        ap = AgentProfiles()
        save_profile_preserving_identity(
            ap, OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        await _set_agent_profiles(async_session_maker, org_id, ap)

        with pytest.raises(HTTPException) as exc:
            await delete_profile(org_id=org_id, name='Default', user_id=str(USER_ID))
        assert exc.value.status_code == 409
        assert 'reviewer' in str(exc.value.detail)

    @pytest.mark.asyncio
    async def test_rename_cascades_to_agent_profile_ref(
        self, async_session_maker, patch_org_profile_routes
    ):
        org_id = patch_org_profile_routes
        ap = AgentProfiles()
        save_profile_preserving_identity(
            ap, OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        await _set_agent_profiles(async_session_maker, org_id, ap)

        await rename_profile(
            org_id=org_id,
            name='Default',
            request=RenameProfileRequest(new_name='Default-v2'),
            user_id=str(USER_ID),
        )

        async with async_session_maker() as session:
            org = (
                (await session.execute(select(Org).where(Org.id == org_id)))
                .scalars()
                .first()
            )
            reloaded = load_agent_profiles(org)
            assert reloaded.load('reviewer').llm_profile_ref == 'Default-v2'
            assert 'Default-v2' in (org.llm_profiles or {}).get('profiles', {})


# ── SaasSettingsStore resolution + provenance ──────────────────────────────


class TestResolveActiveAgentProfile:
    def _store(self):
        with patch('storage.database.a_session_maker'):
            from storage.saas_settings_store import SaasSettingsStore
        return SaasSettingsStore(str(USER_ID))

    def _org_with(self, agent_profile):
        org = MagicMock(spec=Org)
        org.id = ORG_ID
        ap = AgentProfiles()
        save_profile_preserving_identity(ap, agent_profile)
        org.agent_profiles = ap.model_dump(
            mode='json', context={'expose_secrets': True}
        )
        org.llm_profiles = {
            'profiles': {'Default': {'model': 'gpt-4o', 'api_key': 'orgkey'}},
            'active': 'Default',
        }
        return org, next(iter(ap.profiles))

    def test_no_pointer_returns_none(self):
        store = self._store()
        org = MagicMock(spec=Org)
        org.id = ORG_ID
        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = None
        assert store._resolve_active_agent_profile(org, member, {}, None) is None

    def test_falls_back_to_org_wide_active_pointer_when_member_pointer_unset(self):
        """A member whose own ``active_agent_profile_id`` was never set
        (e.g. the losing side of the one-time-seed race) must still resolve
        to the org-wide default (``AgentProfiles.active``) rather than
        silently falling back to the legacy composed settings forever."""
        store = self._store()
        org, pid = self._org_with(
            OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        ap = AgentProfiles.model_validate(org.agent_profiles)
        ap.active = pid
        org.agent_profiles = ap.model_dump(
            mode='json', context={'expose_secrets': True}
        )

        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = None  # never won the seed race

        result = store._resolve_active_agent_profile(org, member, {}, None)
        assert result is not None
        _dump, resolved_id, _revision = result
        assert resolved_id == pid

    def test_stale_pointer_falls_back_to_none(self):
        store = self._store()
        org = MagicMock(spec=Org)
        org.id = ORG_ID
        org.agent_profiles = None
        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = str(uuid.uuid4())
        # Profile deleted out from under the pointer -> graceful None, no raise.
        assert store._resolve_active_agent_profile(org, member, {}, None) is None

    def test_resolves_openhands_profile_and_returns_provenance(self):
        store = self._store()
        org, pid = self._org_with(
            OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = pid

        result = store._resolve_active_agent_profile(org, member, {}, None)
        assert result is not None
        dump, resolved_id, revision = result
        assert resolved_id == pid
        assert revision == 0
        assert dump['agent_kind'] == 'openhands'
        # The resolved LLM came from the referenced org LLM profile.
        assert dump['llm']['model'] == 'gpt-4o'

    def test_override_id_wins_over_member_pointer(self):
        store = self._store()
        org, pid = self._org_with(
            OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = None  # no ambient pointer at all

        result = store._resolve_active_agent_profile(
            org, member, {}, None, override_agent_profile_id=pid
        )
        assert result is not None
        _dump, resolved_id, _revision = result
        assert resolved_id == pid

    def test_override_id_does_not_mutate_member_pointer(self):
        store = self._store()
        org, pid = self._org_with(
            OpenHandsAgentProfile(name='reviewer', llm_profile_ref='Default')
        )
        member = MagicMock(spec=OrgMember)
        member.active_agent_profile_id = None

        store._resolve_active_agent_profile(
            org, member, {}, None, override_agent_profile_id=pid
        )
        # The override must never be written back to the member's own pointer.
        assert member.active_agent_profile_id is None

    @pytest.mark.asyncio
    async def test_load_override_resolves_without_persisting_pointer(
        self, async_session_maker, patch_agent_routes
    ):
        """Loading with an explicit override_agent_profile_id resolves that
        profile's settings and stamps its id as provenance, but leaves
        org_member.active_agent_profile_id untouched in the database — the
        one-off launch override must never persist as the new default."""
        org_id = patch_agent_routes
        uid = str(USER_ID)

        await save_agent_profile(
            name='reviewer',
            body={'llm_profile_ref': 'Default'},
            effective_org_id=org_id,
            user_id=uid,
        )
        listing = await list_agent_profiles(effective_org_id=org_id, user_id=uid)
        override_id = listing.profiles[0].id
        assert override_id is not None
        # The member has NO active pointer at all — the ambient default path
        # would return composed settings, not this profile.
        member_before = await _read_member(async_session_maker, org_id, USER_ID)
        assert member_before.active_agent_profile_id is None

        # Settings.enable_sound_notifications is non-nullable but the User
        # column defaults to NULL; seeded_org doesn't set it since no other
        # test in this file exercises a full load().
        async with async_session_maker() as session:
            user = await session.get(User, USER_ID)
            user.enable_sound_notifications = True
            await session.commit()

        from storage.saas_settings_store import SaasSettingsStore

        with (
            patch('storage.saas_settings_store.a_session_maker', async_session_maker),
            patch('storage.user_store.a_session_maker', async_session_maker),
            patch('storage.org_store.a_session_maker', async_session_maker),
        ):
            store = SaasSettingsStore(uid, effective_org_id=org_id)
            settings = await store.load(override_agent_profile_id=override_id)

        assert settings is not None
        assert settings.active_agent_profile_id == override_id

        member_after = await _read_member(async_session_maker, org_id, USER_ID)
        assert member_after.active_agent_profile_id is None
