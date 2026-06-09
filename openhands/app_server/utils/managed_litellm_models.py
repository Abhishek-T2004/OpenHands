import os
import re

MANAGED_LITELLM_MODELS_ENV = 'OPENHANDS_MANAGED_LITELLM_MODELS'
_MODEL_ENTRY_SPLIT_RE = re.compile(r'[,\n\r]+')


def parse_managed_litellm_models(raw_value: str | None) -> list[str]:
    """Parse operator-configured LiteLLM model entries into route names.

    The raw value comes from OHE/KOTS and accepts comma or newline separated
    model strings. Each model string is the stable LiteLLM route name surfaced
    in OpenHands as ``openhands/<model>``.
    """
    if not raw_value:
        return []

    models: list[str] = []
    seen: set[str] = set()
    for raw_entry in _MODEL_ENTRY_SPLIT_RE.split(raw_value):
        model = raw_entry.strip()
        if not model:
            continue

        model = model.removeprefix('openhands/').removeprefix('litellm_proxy/')
        if not model or model in seen:
            continue
        models.append(model)
        seen.add(model)

    return models


def get_managed_litellm_models() -> list[str]:
    return parse_managed_litellm_models(os.getenv(MANAGED_LITELLM_MODELS_ENV))


def get_managed_openhands_models() -> list[str]:
    return [f'openhands/{model}' for model in get_managed_litellm_models()]
