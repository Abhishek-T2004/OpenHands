import React from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { FaChevronLeft } from "react-icons/fa6";
import {
  CUSTOM_LLM_PROVIDER,
  ModelSelector,
} from "#/components/shared/modals/settings/model-selector";
import { createPermissionGuard } from "#/utils/org/permission-guard";
import { requireOrgDefaultsRedirect } from "#/utils/org/saas-redirect-to-org-defaults-guard";
import { useAgentSettingsSchema } from "#/hooks/query/use-agent-settings-schema";
import { useSettings } from "#/hooks/query/use-settings";
import { SettingsInput } from "#/components/features/settings/settings-input";
import { HelpLink } from "#/ui/help-link";
import { useConfig } from "#/hooks/query/use-config";
import { KeyStatusIcon } from "#/components/features/settings/key-status-icon";
import { OpenHandsApiKeyHelp } from "#/components/features/settings/openhands-api-key-help";
import {
  SdkSectionHeaderProps,
  SdkSectionPage,
} from "#/components/features/settings/sdk-settings/sdk-section-page";
import { I18nKey } from "#/i18n/declaration";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { Settings, SettingsSchema, SettingsScope } from "#/types/settings";
import { extractModelAndProvider } from "#/utils/extract-model-and-provider";
import {
  inferInitialView,
  type SettingsView,
} from "#/utils/sdk-settings-schema";
import { DEFAULT_SETTINGS } from "#/services/settings";
import { useSaveLlmProfile } from "#/hooks/mutation/use-save-llm-profile";
import { useActivateLlmProfile } from "#/hooks/mutation/use-activate-llm-profile";
import { useRenameLlmProfile } from "#/hooks/mutation/use-rename-llm-profile";
import {
  useSaveOrgLlmProfile,
  useActivateOrgLlmProfile,
  useRenameOrgLlmProfile,
} from "#/hooks/mutation/use-org-llm-profile-mutations";
import {
  deriveProfileNameFromModel,
  PROFILE_NAME_PATTERN,
} from "#/utils/derive-profile-name";
import { LlmProfilesManager } from "#/components/features/settings/llm-profiles-manager";
import { OrgLlmProfilesManager } from "#/components/features/settings/org-llm-profiles-manager";
import { ProfileNameInput } from "#/components/features/settings/profile-name-input";
import { Typography } from "#/ui/typography";
import { useOrgTypeAndAccess } from "#/hooks/use-org-type-and-access";
import { useMe } from "#/hooks/query/use-me";
import { usePermission } from "#/hooks/organizations/use-permissions";
import {
  allowsUserLlmConfiguration,
  isManagedLiteLlmBaseUrl,
  isOheManagedMode,
  normalizeBaseUrl,
} from "#/utils/ohe-managed-mode";

const LLM_EXCLUDED_KEYS = new Set(["llm.model", "llm.api_key", "llm.base_url"]);

const buildModelId = (provider: string | null, model: string | null) => {
  if (!provider || !model) return null;
  return `${provider}/${model}`;
};

const getSchemaFieldDefaultValue = (
  schema: SettingsSchema | null | undefined,
  fieldKey: string,
) =>
  schema?.sections
    .flatMap((section) => section.fields)
    .find((field) => field.key === fieldKey)?.default ?? null;

const KNOWN_PROVIDER_DEFAULT_BASE_URLS: Partial<Record<string, Set<string>>> = {
  openai: new Set(["https://api.openai.com", "https://api.openai.com/v1"]),
  openhands: new Set([
    "https://llm-proxy.app.all-hands.dev",
    "https://llm-proxy.app.all-hands.dev/v1",
  ]),
  litellm_proxy: new Set([
    "https://llm-proxy.app.all-hands.dev",
    "https://llm-proxy.app.all-hands.dev/v1",
  ]),
};

const isProviderDefaultBaseUrl = (
  model: string,
  baseUrl: string,
  managedLiteLlmBaseUrl?: string,
) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const { provider } = extractModelAndProvider(model);

  if (isManagedLiteLlmBaseUrl(baseUrl, managedLiteLlmBaseUrl)) {
    return true;
  }

  if (provider) {
    const knownDefaults = KNOWN_PROVIDER_DEFAULT_BASE_URLS[provider];
    if (knownDefaults) {
      return knownDefaults.has(normalizedBaseUrl);
    }
  }

  return Object.values(KNOWN_PROVIDER_DEFAULT_BASE_URLS).some((knownDefaults) =>
    knownDefaults?.has(normalizedBaseUrl),
  );
};

const isManagedLiteLlmSettings = (
  model: string,
  baseUrl: string,
  managedLiteLlmBaseUrl?: string,
) => {
  const { provider } = extractModelAndProvider(model);
  if (baseUrl.trim().length > 0) {
    return isManagedLiteLlmBaseUrl(baseUrl, managedLiteLlmBaseUrl);
  }

  return provider === "openhands" || provider === "litellm_proxy";
};

type ProfileFormMode = "create" | "edit";

export function LlmSettingsScreen({
  scope = "personal",
}: {
  scope?: SettingsScope;
}) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: settings } = useSettings(scope);
  const { data: schema } = useAgentSettingsSchema(
    settings?.agent_settings_schema,
  );
  const { data: config } = useConfig();
  const { organizationId } = useOrgTypeAndAccess();
  const { data: me } = useMe();
  const { hasPermission } = usePermission(me?.role ?? "member");

  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(
    null,
  );
  const hasHydratedInitialPersonalSaasViewRef = React.useRef(false);
  // Captured during buildPayload so onSaveSuccess can derive a profile name
  // from the exact model that was just persisted.
  const lastSavedModelRef = React.useRef<string | null>(null);

  // Personal profile hooks (for OSS mode)
  const saveProfile = useSaveLlmProfile();
  const activateProfile = useActivateLlmProfile();
  const renameProfile = useRenameLlmProfile();

  // Org profile hooks (for org defaults)
  const saveOrgProfile = useSaveOrgLlmProfile(organizationId);
  const activateOrgProfile = useActivateOrgLlmProfile(organizationId);
  const renameOrgProfile = useRenameOrgLlmProfile(organizationId);

  // Controls whether the LLM form or the Profiles list is shown. Flipping
  // this unmounts the inactive branch, so the SdkSectionPage re-hydrates
  // its view from ``initialViewHint`` when coming back from profiles.
  // Enable profiles for personal settings and org defaults. Org members can
  // view org profiles, but only admins/owners can create or manage them.
  const shouldShowProfilesForScope = scope === "personal" || scope === "org";
  const canManageProfilesForScope =
    scope === "personal" || hasPermission("edit_llm_settings");
  const [showProfiles, setShowProfiles] = React.useState(
    shouldShowProfilesForScope,
  );
  // User-supplied profile name. Empty → fall back to deriveProfileNameFromModel
  // in handleSaveSuccess. Reset on every form open so a stale name from the
  // previous Add doesn't leak in.
  const [profileName, setProfileName] = React.useState("");
  const [profileNameWasEdited, setProfileNameWasEdited] = React.useState(false);
  const [profileFormMode, setProfileFormMode] =
    React.useState<ProfileFormMode | null>(null);
  // Snapshotted on form open so we can flag the form dirty when the user
  // edits *only* the name — the SDK section page tracks the LLM fields but
  // not the profile-name input that lives outside its schema.
  const [initialProfileName, setInitialProfileName] = React.useState("");
  // When the user clicks Basic / Advanced / All from inside the profiles
  // view, we want the LLM form to open on *that* tier — not whatever the
  // schema happened to infer. We stash the choice here and consume it in
  // getInitialView below.
  const [initialViewHint, setInitialViewHint] =
    React.useState<SettingsView | null>(null);
  const profileNameInputRef = React.useRef<HTMLInputElement>(null);

  const isProfilesView = shouldShowProfilesForScope && showProfiles;
  const isOrgProfileMode = scope === "org";

  const defaultModel = String(
    (DEFAULT_SETTINGS.agent_settings?.llm as Record<string, unknown>)?.model ??
      "",
  );

  const isSaasMode = config?.app_mode === "saas";
  const isManagedMode = isOheManagedMode(config);
  const allowUserLlmConfiguration = allowsUserLlmConfiguration(config);
  const managedLiteLlmBaseUrl = config?.managed_litellm_base_url?.trim();
  const restrictToManagedProvider = isManagedMode && !allowUserLlmConfiguration;

  React.useEffect(() => {
    if (profileFormMode === "create" && !showProfiles) {
      return;
    }

    if (settings?.llm_model) {
      const trimmedBaseUrl = settings.llm_base_url?.trim() ?? "";
      const shouldSelectCustom =
        isSaasMode &&
        allowUserLlmConfiguration &&
        trimmedBaseUrl.length > 0 &&
        !isProviderDefaultBaseUrl(
          settings.llm_model,
          trimmedBaseUrl,
          managedLiteLlmBaseUrl,
        );

      if (shouldSelectCustom) {
        setSelectedProvider(CUSTOM_LLM_PROVIDER);
        return;
      }

      const { provider } = extractModelAndProvider(settings.llm_model);
      setSelectedProvider(provider || null);
    }
  }, [
    allowUserLlmConfiguration,
    isSaasMode,
    managedLiteLlmBaseUrl,
    profileFormMode,
    settings?.llm_base_url,
    settings?.llm_model,
    showProfiles,
  ]);

  React.useEffect(() => {
    const checkout = searchParams.get("checkout");

    if (checkout === "success") {
      displaySuccessToast(t(I18nKey.SUBSCRIPTION$SUCCESS));
      setSearchParams({});
    } else if (checkout === "cancel") {
      displayErrorToast(t(I18nKey.SUBSCRIPTION$FAILURE));
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, t]);

  const infoMessageKey = React.useMemo((): I18nKey | null => {
    if (!isSaasMode) return null;
    if (scope !== "org") {
      return I18nKey.SETTINGS$PERSONAL_AGENT_INFO;
    }
    return restrictToManagedProvider
      ? null
      : I18nKey.SETTINGS$ORG_DEFAULTS_INFO;
  }, [isSaasMode, restrictToManagedProvider, scope]);

  const maybeSyncProfileName = React.useCallback(
    (model: string) => {
      if (profileNameWasEdited) {
        return;
      }
      setProfileName(deriveProfileNameFromModel(model) ?? "");
    },
    [profileNameWasEdited],
  );

  const focusProfileNameInput = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      const input = profileNameInputRef.current;
      if (!input) {
        return;
      }
      input.focus();
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    });
  }, []);

  const getInitialView = React.useCallback(
    (
      currentSettings: Settings,
      filteredSchema: SettingsSchema,
    ): SettingsView => {
      // A hint set by the Profiles mirror-strip beats every other rule —
      // the user explicitly asked for this tier when leaving profiles.
      if (initialViewHint) {
        return initialViewHint;
      }

      // Personal SaaS users now land on Available Models first; the form
      // is mounted on-demand (Add / Edit). The first form mount per session
      // should still default to basic so users aren't dropped straight into
      // advanced/all even if the active profile has complex fields.
      if (
        isSaasMode &&
        scope !== "org" &&
        !hasHydratedInitialPersonalSaasViewRef.current
      ) {
        hasHydratedInitialPersonalSaasViewRef.current = true;
        return "basic";
      }

      const currentModel = currentSettings.llm_model ?? "";
      const trimmedBaseUrl = currentSettings.llm_base_url?.trim() ?? "";
      if (
        isManagedMode &&
        isManagedLiteLlmSettings(
          currentModel,
          trimmedBaseUrl,
          managedLiteLlmBaseUrl,
        )
      ) {
        return "basic";
      }

      const schemaView = inferInitialView(currentSettings, filteredSchema);
      if (schemaView !== "basic") {
        return schemaView;
      }

      const hasCustomBaseUrl =
        trimmedBaseUrl.length > 0 &&
        !isProviderDefaultBaseUrl(
          currentModel,
          trimmedBaseUrl,
          managedLiteLlmBaseUrl,
        );

      return hasCustomBaseUrl ? "all" : "basic";
    },
    [initialViewHint, isManagedMode, isSaasMode, managedLiteLlmBaseUrl, scope],
  );

  const buildHeader = React.useCallback(
    ({ values, isDisabled, view, onChange }: SdkSectionHeaderProps) => {
      const modelValue =
        typeof values["llm.model"] === "string" ? values["llm.model"] : "";
      const baseUrlValue =
        typeof values["llm.base_url"] === "string"
          ? values["llm.base_url"]
          : "";
      const derivedProvider = modelValue
        ? extractModelAndProvider(modelValue).provider || null
        : null;
      const isCustomProviderSelected = selectedProvider === CUSTOM_LLM_PROVIDER;
      const shouldRenderCustomFields = isSaasMode
        ? isCustomProviderSelected
        : view !== "basic";
      let activeProvider = derivedProvider;
      if (!shouldRenderCustomFields) {
        activeProvider = selectedProvider ?? derivedProvider;
      } else if (isCustomProviderSelected) {
        activeProvider = CUSTOM_LLM_PROVIDER;
      }
      const shouldHideApiKeyInput =
        restrictToManagedProvider ||
        (isSaasMode &&
          activeProvider === "openhands" &&
          !shouldRenderCustomFields);
      const showOpenHandsApiKeyHelp =
        modelValue.startsWith("openhands/") && !isManagedMode;

      const renderApiKeyInput = (testId: string, helpTestId: string) => {
        if (shouldHideApiKeyInput) {
          return null;
        }

        return (
          <>
            <SettingsInput
              testId={testId}
              label={t(I18nKey.SETTINGS_FORM$API_KEY)}
              type="password"
              className="w-full"
              value={
                typeof values["llm.api_key"] === "string"
                  ? values["llm.api_key"]
                  : ""
              }
              placeholder={settings?.llm_api_key_set ? "<hidden>" : ""}
              onChange={(value) => onChange("llm.api_key", value)}
              isDisabled={isDisabled}
              startContent={
                settings?.llm_api_key_set ? (
                  <KeyStatusIcon isSet={settings.llm_api_key_set} />
                ) : undefined
              }
            />

            <HelpLink
              testId={helpTestId}
              text={t(I18nKey.SETTINGS$DONT_KNOW_API_KEY)}
              linkText={t(I18nKey.SETTINGS$CLICK_FOR_INSTRUCTIONS)}
              href="https://docs.openhands.dev/usage/local-setup#getting-an-api-key"
            />
          </>
        );
      };

      const profileNamePlaceholder =
        deriveProfileNameFromModel(modelValue) ?? "";

      const profileNameInput = canManageProfilesForScope ? (
        <ProfileNameInput
          testId="llm-profile-name-input"
          ruleTestId="llm-profile-name-rule"
          value={profileName}
          placeholder={profileNamePlaceholder}
          label={t(I18nKey.SETTINGS$LLM_PROFILE_NAME)}
          helpText={t(I18nKey.SETTINGS$LLM_PROFILE_NAME_HELP)}
          inputRef={profileNameInputRef}
          onChange={(value) => {
            setProfileName(value);
            setProfileNameWasEdited(true);
          }}
          isDisabled={isDisabled}
        />
      ) : null;

      return (
        <div className="flex flex-col gap-6">
          {infoMessageKey ? (
            <Typography.Paragraph
              testId="llm-settings-info-message"
              className="text-sm text-tertiary-alt"
            >
              {t(infoMessageKey)}
            </Typography.Paragraph>
          ) : null}

          {!shouldRenderCustomFields ? (
            <div
              className="flex flex-col gap-6"
              data-testid="llm-settings-form-basic"
            >
              <ModelSelector
                currentModel={modelValue || undefined}
                selectedProviderOverride={selectedProvider ?? undefined}
                managedProviderOnly={restrictToManagedProvider}
                allowCustomProvider={isSaasMode && allowUserLlmConfiguration}
                onChange={(provider, model) => {
                  setSelectedProvider(provider);
                  if (provider === CUSTOM_LLM_PROVIDER) {
                    return;
                  }
                  if (provider === "openhands" && isSaasMode) {
                    const defaultBaseUrl = getSchemaFieldDefaultValue(
                      schema,
                      "llm.base_url",
                    );
                    onChange("llm.api_key", "");
                    onChange(
                      "llm.base_url",
                      typeof defaultBaseUrl === "string" ? defaultBaseUrl : "",
                    );
                  }
                  const nextModel = buildModelId(provider, model);
                  if (nextModel) {
                    onChange("llm.model", nextModel);
                    maybeSyncProfileName(nextModel);
                    focusProfileNameInput();
                  }
                }}
                wrapperClassName="!flex-col !gap-6"
                isDisabled={isDisabled}
              />

              {showOpenHandsApiKeyHelp ? (
                <OpenHandsApiKeyHelp testId="openhands-api-key-help" />
              ) : null}

              {renderApiKeyInput(
                "llm-api-key-input",
                "llm-api-key-help-anchor",
              )}
            </div>
          ) : (
            <div
              className="flex flex-col gap-6"
              data-testid="llm-settings-form-advanced"
            >
              {isSaasMode ? (
                <ModelSelector
                  currentModel={modelValue || undefined}
                  selectedProviderOverride={CUSTOM_LLM_PROVIDER}
                  allowCustomProvider
                  onChange={(provider) => {
                    setSelectedProvider(provider);
                  }}
                  wrapperClassName="!flex-col !gap-6"
                  isDisabled={isDisabled}
                />
              ) : null}

              <SettingsInput
                testId="llm-custom-model-input"
                label={t(I18nKey.SETTINGS$CUSTOM_MODEL)}
                type="text"
                className="w-full"
                value={modelValue}
                placeholder={defaultModel}
                onChange={(value) => {
                  onChange("llm.model", value);
                  maybeSyncProfileName(value);
                }}
                isDisabled={isDisabled}
              />

              {showOpenHandsApiKeyHelp ? (
                <OpenHandsApiKeyHelp testId="openhands-api-key-help-2" />
              ) : null}

              <SettingsInput
                testId="base-url-input"
                label={t(I18nKey.SETTINGS$BASE_URL)}
                type="text"
                className="w-full"
                value={baseUrlValue}
                placeholder="https://api.openai.com"
                onChange={(value) => onChange("llm.base_url", value)}
                isDisabled={isDisabled}
              />

              {renderApiKeyInput(
                "llm-api-key-input",
                "llm-api-key-help-anchor-advanced",
              )}
            </div>
          )}

          {profileNameInput}
        </div>
      );
    },
    [
      infoMessageKey,
      allowUserLlmConfiguration,
      isManagedMode,
      isSaasMode,
      defaultModel,
      focusProfileNameInput,
      maybeSyncProfileName,
      profileName,
      profileNameWasEdited,
      scope,
      selectedProvider,
      schema,
      settings?.llm_api_key_set,
      restrictToManagedProvider,
      canManageProfilesForScope,
      t,
    ],
  );

  const buildPayload = React.useCallback(
    (
      defaultPayload: Record<string, unknown>,
      context: {
        values: Record<string, string | boolean>;
        view: SettingsView;
      },
    ) => {
      // defaultPayload is the wrapped diff (e.g.
      // `{ agent_settings_diff: { llm: { model: "gpt-4" } } }`); we only
      // mutate the inner `llm` object below.
      const agentSettings = structuredClone(
        (defaultPayload.agent_settings_diff as Record<string, unknown>) ?? {},
      );

      const modelValue =
        typeof context.values["llm.model"] === "string"
          ? context.values["llm.model"].trim()
          : "";
      const derivedProvider = modelValue
        ? extractModelAndProvider(modelValue).provider || null
        : null;
      const isCustomProviderSelected = selectedProvider === CUSTOM_LLM_PROVIDER;
      let activeProvider = derivedProvider;
      if (context.view === "basic" && !isCustomProviderSelected) {
        activeProvider = selectedProvider ?? derivedProvider;
      } else if (isCustomProviderSelected) {
        activeProvider = CUSTOM_LLM_PROVIDER;
      }
      const shouldUseManagedKey =
        isSaasMode &&
        activeProvider === "openhands" &&
        !isCustomProviderSelected;

      const llm = (agentSettings.llm ?? {}) as Record<string, unknown>;
      if (shouldUseManagedKey) {
        llm.api_key = "";
        agentSettings.llm = llm;
      }

      if (context.view === "basic" && !isCustomProviderSelected) {
        llm.base_url = getSchemaFieldDefaultValue(schema, "llm.base_url");
        agentSettings.llm = llm;
      }

      // Remember the model currently shown in the form — this is what the
      // user is saving regardless of whether `llm.model` was toggled dirty
      // this turn. ``defaultPayload`` only includes dirty fields, so
      // falling back to ``context.values`` makes the profile auto-creation
      // fire on same-value re-saves (e.g. save → delete profile → save
      // again).
      lastSavedModelRef.current = modelValue || null;

      return { agent_settings_diff: agentSettings };
    },
    [isSaasMode, schema, selectedProvider],
  );

  const handleSaveSuccess = React.useCallback(async () => {
    const savedModel = lastSavedModelRef.current;
    const trimmedUserName = profileName.trim();
    // Use the user-supplied name only if it matches the backend regex —
    // otherwise silently fall back to the model-derived default (the helper
    // text under the input has already warned them their name was invalid).
    const userName = PROFILE_NAME_PATTERN.test(trimmedUserName)
      ? trimmedUserName
      : null;
    const derivedName = savedModel
      ? deriveProfileNameFromModel(savedModel)
      : null;
    const name = userName ?? derivedName;

    const shouldSaveProfile =
      canManageProfilesForScope &&
      (scope === "personal" || (scope === "org" && organizationId)) &&
      name;

    if (shouldSaveProfile) {
      try {
        const useOrgHooks = scope === "org";

        // Editing an existing profile and renaming it via the form should
        // rename the record in place rather than spawning a new one and
        // leaving the original orphaned.
        if (initialProfileName && initialProfileName !== name) {
          if (useOrgHooks) {
            await renameOrgProfile.mutateAsync({
              name: initialProfileName,
              newName: name,
            });
          } else {
            await renameProfile.mutateAsync({
              name: initialProfileName,
              newName: name,
            });
          }
        }
        // Omit `llm` → backend snapshots the just-saved agent_settings.llm
        // (api_key and all). Saves us from having to hand-reconstruct the
        // config and risk mangling the secret placeholder handling.
        if (useOrgHooks) {
          await saveOrgProfile.mutateAsync({
            name,
            request: { include_secrets: true },
          });
          await activateOrgProfile.mutateAsync(name);
        } else {
          await saveProfile.mutateAsync({
            name,
            request: { include_secrets: true },
          });
          await activateProfile.mutateAsync(name);
        }
      } catch {
        // Best-effort: the settings save already succeeded. Profile cap
        // (HTTP 409) and transient errors are surfaced on the Profiles page.
      }
    }

    setProfileName("");
    setProfileNameWasEdited(false);
    setInitialProfileName("");
    setInitialViewHint(null);
    setProfileFormMode(null);
    setShowProfiles(true);
  }, [
    activateProfile,
    activateOrgProfile,
    canManageProfilesForScope,
    initialProfileName,
    organizationId,
    profileName,
    renameProfile,
    renameOrgProfile,
    saveProfile,
    saveOrgProfile,
    scope,
  ]);

  const openForm = (view: SettingsView | null, name = "") => {
    const isEdit = Boolean(name);
    setProfileName(isEdit ? name : "");
    setProfileNameWasEdited(isEdit);
    setProfileFormMode(isEdit ? "edit" : "create");
    setInitialProfileName(name);
    setInitialViewHint(view);
    if (!isEdit) {
      setSelectedProvider(null);
    }
    setShowProfiles(false);
  };

  const createProfileInitialValueOverrides = React.useMemo(
    () =>
      profileFormMode === "create"
        ? {
            agent_settings: {
              "llm.model": "",
              "llm.api_key": "",
              "llm.base_url": "",
            },
          }
        : undefined,
    [profileFormMode],
  );

  const viewOverride = React.useMemo<SettingsView | null>(() => {
    if (!isSaasMode) {
      return null;
    }
    return selectedProvider === CUSTOM_LLM_PROVIDER ? "advanced" : "basic";
  }, [isSaasMode, selectedProvider]);

  if (isProfilesView) {
    if (isOrgProfileMode) {
      if (!organizationId) {
        return null;
      }
      return (
        <OrgLlmProfilesManager
          orgId={organizationId}
          canManage={canManageProfilesForScope}
          onAddProfile={
            canManageProfilesForScope ? () => openForm(null) : undefined
          }
          onEditProfile={
            canManageProfilesForScope
              ? (profile) => openForm(null, profile.name)
              : undefined
          }
        />
      );
    }
    // Use personal profiles manager for OSS mode
    return (
      <LlmProfilesManager
        onAddProfile={() => openForm(null)}
        onEditProfile={(profile) => openForm(null, profile.name)}
      />
    );
  }

  // Sub-page back affordance when profiles are enabled. Replaces the previous
  // "Profiles" trailing action so the form view follows the second-level
  // settings pattern.
  const backToProfiles = shouldShowProfilesForScope ? (
    <button
      data-testid="llm-back-to-profiles"
      type="button"
      onClick={() => {
        setInitialViewHint(null);
        setProfileFormMode(null);
        setShowProfiles(true);
      }}
      className="flex items-center gap-2 self-start text-sm text-gray-300 hover:text-white cursor-pointer"
    >
      <FaChevronLeft size={12} aria-hidden="true" />
      {t(I18nKey.SETTINGS$BACK_TO_LLM_LIST)}
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {backToProfiles}
      <SdkSectionPage
        scope={scope}
        settingsSources={[
          {
            settingsSource: "agent_settings",
            sectionKeys: ["llm"],
            excludeKeys: LLM_EXCLUDED_KEYS,
          },
        ]}
        header={buildHeader}
        buildPayload={buildPayload}
        // The profile form can always be saved: it snapshots the current LLM
        // config as a profile, and the name is optional — it falls back to a
        // model-derived default in handleSaveSuccess. So don't gate Save on the
        // settings fields being dirty. This matters in SaaS managed mode, where
        // the model is fixed and there's no editable API key, leaving the form
        // pristine and Save stuck disabled.
        extraDirty={canManageProfilesForScope}
        onSaveSuccess={handleSaveSuccess}
        getInitialView={getInitialView}
        initialValueOverrides={createProfileInitialValueOverrides}
        isSaveDisabled={({ values }) =>
          profileFormMode === "create" &&
          !(
            typeof values["llm.model"] === "string" &&
            values["llm.model"].trim().length > 0
          )
        }
        forceShowAdvancedView
        hideViewToggle={isSaasMode}
        viewOverride={viewOverride}
        allowAllView={!isSaasMode}
        testId="llm-settings-screen"
      />
    </div>
  );
}

const orgDefaultsRedirectGuard = requireOrgDefaultsRedirect(
  "/settings/org-defaults",
);
const llmPermissionGuard = createPermissionGuard("view_llm_settings");

export const clientLoader = async (args: { request: Request }) => {
  const blocked = await orgDefaultsRedirectGuard(args);
  if (blocked) return blocked;
  return llmPermissionGuard(args);
};

export default LlmSettingsScreen;
