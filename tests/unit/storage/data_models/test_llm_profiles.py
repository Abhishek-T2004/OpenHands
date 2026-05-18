"""Unit tests for :class:`LLMProfiles` (pure profile operations).

Settings-integration tests (``switch_to_profile`` + serializer round-trip
through ``Settings``) live in ``test_settings.py``.
"""

import pytest
from pydantic import SecretStr, ValidationError

from openhands.app_server.settings.llm_profiles import (
    MAX_PROFILES_PER_USER,
    AgentProfile,
    LLMProfiles,
    ProfileAlreadyExistsError,
    ProfileLimitExceededError,
    ProfileNotFoundError,
    StrictAgentProfile,
    StrictLLM,
)
from openhands.sdk.llm import LLM


def _make_profile(
    model: str = 'openai/gpt-4o',
    api_key: str | None = None,
) -> AgentProfile:
    return AgentProfile(
        model=model,
        api_key=SecretStr(api_key) if api_key is not None else None,
    )


def _make_acp_profile(
    acp_server: str = 'claude-code',
    acp_model: str | None = 'claude-opus-4-7',
    api_key: str | None = None,
) -> AgentProfile:
    return AgentProfile(
        agent_kind='acp',
        acp_server=acp_server,
        acp_model=acp_model,
        api_key=SecretStr(api_key) if api_key is not None else None,
    )


# ── Backward-compat: legacy LLM-shaped data ───────────────────────


def test_legacy_llm_shaped_data_loads_as_openhands_profile():
    """Old profiles stored as full LLM model dumps must load unchanged."""
    data = {
        'profiles': {
            'gpt': {
                'model': 'openai/gpt-4o',
                'api_key': 'sk-xxx',
                'temperature': 0.0,   # LLM-only field — must be ignored
                'num_retries': 3,     # LLM-only field — must be ignored
            },
        },
    }
    profiles = LLMProfiles.model_validate(data)

    p = profiles.get('gpt')
    assert p is not None
    assert p.agent_kind == 'openhands'
    assert p.model == 'openai/gpt-4o'
    assert p.acp_server is None


def test_acp_profile_round_trips():
    """ACP profiles load and dump correctly."""
    data = {
        'profiles': {
            'cc': {
                'agent_kind': 'acp',
                'acp_server': 'claude-code',
                'acp_model': 'claude-opus-4-7',
            },
        },
    }
    profiles = LLMProfiles.model_validate(data)

    p = profiles.get('cc')
    assert p is not None
    assert p.agent_kind == 'acp'
    assert p.acp_server == 'claude-code'
    assert p.acp_model == 'claude-opus-4-7'


# ── Queries ───────────────────────────────────────────────────────


def test_has_reflects_presence():
    profiles = LLMProfiles()
    assert profiles.has('x') is False
    profiles.save('x', _make_profile())
    assert profiles.has('x') is True


def test_require_returns_profile_for_present():
    profiles = LLMProfiles()
    profiles.save('x', _make_profile(model='anthropic/claude-opus-4'))

    p = profiles.require('x')

    assert isinstance(p, AgentProfile)
    assert p.model == 'anthropic/claude-opus-4'


def test_require_raises_profile_not_found_with_name():
    profiles = LLMProfiles()

    with pytest.raises(ProfileNotFoundError) as exc_info:
        profiles.require('missing')

    assert exc_info.value.name == 'missing'
    assert "'missing'" in str(exc_info.value)


def test_summaries_returns_expected_fields():
    profiles = LLMProfiles()
    profiles.save('p1', _make_profile(model='openai/gpt-4o', api_key='sk-1'))
    profiles.save(
        'p2',
        AgentProfile(model='anthropic/claude-opus-4', base_url='https://example.com'),
    )

    summaries = {s['name']: s for s in profiles.summaries()}

    assert summaries['p1'] == {
        'name': 'p1',
        'agent_kind': 'openhands',
        'model': 'openai/gpt-4o',
        'acp_server': None,
        'acp_model': None,
        'base_url': None,
        'api_key_set': True,
    }
    assert summaries['p2'] == {
        'name': 'p2',
        'agent_kind': 'openhands',
        'model': 'anthropic/claude-opus-4',
        'acp_server': None,
        'acp_model': None,
        'base_url': 'https://example.com',
        'api_key_set': False,
    }


def test_summaries_acp_profile():
    profiles = LLMProfiles()
    profiles.save('cc', _make_acp_profile(api_key='sk-ant'))

    s = profiles.summaries()[0]
    assert s['agent_kind'] == 'acp'
    assert s['acp_server'] == 'claude-code'
    assert s['acp_model'] == 'claude-opus-4-7'
    assert s['model'] is None
    assert s['api_key_set'] is True


def test_summaries_empty_by_default():
    assert LLMProfiles().summaries() == []


# ── Mutations ─────────────────────────────────────────────────────


def test_save_overwrites_existing_entry():
    profiles = LLMProfiles()
    profiles.save('p', _make_profile(model='a'))
    profiles.save('p', _make_profile(model='b'))

    assert profiles.get('p').model == 'b'
    assert len(profiles.profiles) == 1


def test_save_api_key_handling():
    """Default keeps the api_key; ``include_secrets=False`` clears it."""
    profiles = LLMProfiles()
    profiles.save('keep', _make_profile(api_key='sk-abc'))
    profiles.save('drop', _make_profile(api_key='sk-xyz'), include_secrets=False)

    assert profiles.get('keep').api_key.get_secret_value() == 'sk-abc'
    assert profiles.get('drop').api_key is None


def test_save_stores_a_copy_not_the_caller_reference():
    """Profiles must own their config so caller-side mutations can't leak."""
    profiles = LLMProfiles()
    original = _make_profile(model='openai/gpt-4o', api_key='sk-abc')

    profiles.save('p', original)

    assert profiles.get('p') is not original


def test_delete_returns_true_then_false():
    profiles = LLMProfiles()
    profiles.save('p', _make_profile())

    assert profiles.delete('p') is True
    assert profiles.get('p') is None
    assert profiles.delete('p') is False


def test_delete_clears_active_when_active_removed():
    profiles = LLMProfiles()
    profiles.save('p', _make_profile())
    profiles.active = 'p'

    profiles.delete('p')

    assert profiles.active is None


def test_delete_leaves_active_alone_when_other_removed():
    profiles = LLMProfiles()
    profiles.save('p1', _make_profile())
    profiles.save('p2', _make_profile())
    profiles.active = 'p1'

    profiles.delete('p2')

    assert profiles.active == 'p1'


# ── Rename ────────────────────────────────────────────────────────


def test_rename_preserves_profile_config():
    profiles = LLMProfiles()
    profiles.save('old', _make_profile(model='openai/gpt-4o', api_key='secret'))

    profiles.rename('old', 'new')

    assert profiles.get('old') is None
    renamed = profiles.get('new')
    assert renamed is not None
    assert renamed.model == 'openai/gpt-4o'
    assert renamed.api_key.get_secret_value() == 'secret'


def test_rename_preserves_active_flag_when_renamed_was_active():
    profiles = LLMProfiles()
    profiles.save('p', _make_profile())
    profiles.active = 'p'

    profiles.rename('p', 'q')

    assert profiles.active == 'q'


def test_rename_leaves_active_alone_when_renaming_other():
    profiles = LLMProfiles()
    profiles.save('p1', _make_profile())
    profiles.save('p2', _make_profile())
    profiles.active = 'p1'

    profiles.rename('p2', 'p2-renamed')

    assert profiles.active == 'p1'


def test_rename_to_same_name_is_noop():
    profiles = LLMProfiles()
    profiles.save('p', _make_profile())
    profiles.active = 'p'

    profiles.rename('p', 'p')

    assert profiles.has('p')
    assert profiles.active == 'p'


def test_rename_unknown_raises_profile_not_found():
    profiles = LLMProfiles()
    with pytest.raises(ProfileNotFoundError, match='ghost'):
        profiles.rename('ghost', 'new')


def test_rename_to_existing_name_raises():
    profiles = LLMProfiles()
    profiles.save('a', _make_profile())
    profiles.save('b', _make_profile())

    with pytest.raises(ProfileAlreadyExistsError, match='b'):
        profiles.rename('a', 'b')

    # Original entries untouched.
    assert profiles.has('a')
    assert profiles.has('b')


def test_rename_preserves_insertion_order():
    profiles = LLMProfiles()
    profiles.save('a', _make_profile())
    profiles.save('b', _make_profile())
    profiles.save('c', _make_profile())

    profiles.rename('b', 'B')

    assert list(profiles.profiles.keys()) == ['a', 'B', 'c']


# ── Serialization ─────────────────────────────────────────────────


def test_masking_and_roundtrip():
    """Masked by default, exposed with context, reconstructible via model_validate."""
    profiles = LLMProfiles()
    profiles.save('p', _make_profile(api_key='secret'))
    profiles.active = 'p'

    assert profiles.model_dump(mode='json')['profiles']['p']['api_key'] != 'secret'
    exposed = profiles.model_dump(mode='json', context={'expose_secrets': True})
    assert exposed['profiles']['p']['api_key'] == 'secret'

    rehydrated = LLMProfiles.model_validate(exposed)
    assert rehydrated.active == 'p'
    assert rehydrated.get('p').api_key.get_secret_value() == 'secret'


# ── Invariants ────────────────────────────────────────────────────


def test_active_stays_in_profiles_at_all_entry_points():
    """``active`` must point at an existing profile — enforced both at
    validate time (loading corrupted state) and at assignment time."""
    # Validate-time: orphan active in persisted data is auto-cleared.
    loaded = LLMProfiles.model_validate(
        {'profiles': {'a': {'model': 'openai/gpt-4o'}}, 'active': 'ghost'}
    )
    assert loaded.active is None

    # Assignment-time: setting to an unknown name clears; known keeps.
    profiles = LLMProfiles()
    profiles.save('a', _make_profile())
    profiles.active = 'ghost'
    assert profiles.active is None
    profiles.active = 'a'
    assert profiles.active == 'a'


def test_orphan_active_heals_on_roundtrip():
    """Disaster-recovery path: if something bypasses the invariant (rogue
    DB write, manual file edit, deserialising old data), the next
    validate cycle must drop the orphan rather than keep a dangling pointer.
    """
    profiles = LLMProfiles()
    profiles.save('real', _make_profile())
    object.__setattr__(profiles, 'active', 'ghost')  # bypass validator

    data = profiles.model_dump(mode='json')
    rehydrated = LLMProfiles.model_validate(data)

    assert rehydrated.active is None
    assert rehydrated.has('real')


# ── Per-profile best-effort load ──────────────────────────────────


def test_invalid_profile_entry_is_skipped_not_fatal():
    """A single bad profile must not prevent the rest from loading."""
    data = {
        'profiles': {
            'ok': {'model': 'openai/gpt-4o'},
            # agent_kind='acp' without acp_server → validator error
            'bad': {'agent_kind': 'acp'},
        },
    }

    profiles = LLMProfiles.model_validate(data)

    assert list(profiles.profiles) == ['ok']


# ── Count cap ─────────────────────────────────────────────────────


def test_save_fails_past_limit():
    profiles = LLMProfiles()
    for i in range(MAX_PROFILES_PER_USER):
        profiles.save(f'p{i}', _make_profile())

    with pytest.raises(ProfileLimitExceededError) as exc_info:
        profiles.save('one-too-many', _make_profile())

    assert exc_info.value.limit == MAX_PROFILES_PER_USER


def test_save_at_limit_can_overwrite_existing():
    profiles = LLMProfiles()
    for i in range(MAX_PROFILES_PER_USER):
        profiles.save(f'p{i}', _make_profile(model='openai/gpt-4o'))

    # Overwriting an existing slot must succeed even at the cap.
    profiles.save('p0', _make_profile(model='anthropic/claude-opus-4'))

    assert profiles.get('p0').model == 'anthropic/claude-opus-4'


# ── StrictLLM / StrictAgentProfile ───────────────────────────────


def test_strict_llm_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        StrictLLM.model_validate(
            {'model': 'openai/gpt-4o', 'totally_made_up_field': 'x'}
        )


def test_strict_agent_profile_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        StrictAgentProfile.model_validate(
            {'model': 'openai/gpt-4o', 'totally_made_up_field': 'x'}
        )


def test_agent_profile_from_llm():
    llm = LLM(model='openai/gpt-4o', api_key=SecretStr('sk-1'))
    p = AgentProfile.from_llm(llm)
    assert p.agent_kind == 'openhands'
    assert p.model == 'openai/gpt-4o'
    assert p.api_key.get_secret_value() == 'sk-1'
