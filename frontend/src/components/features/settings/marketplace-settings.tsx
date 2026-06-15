import React from "react";
import { useTranslation } from "react-i18next";
import { useSaveSettings } from "#/hooks/mutation/use-save-settings";
import { useSettings } from "#/hooks/query/use-settings";
import { I18nKey } from "#/i18n/declaration";
import {
  MarketplaceRegistration,
  MarketplaceWithScope,
} from "#/types/settings";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { retrieveAxiosErrorMessage } from "#/utils/retrieve-axios-error-message";
import { BrandButton } from "./brand-button";
import { SettingsSwitch } from "./settings-switch";

interface MarketplaceFormData {
  source: string;
  name: string;
  ref: string;
  repo_path: string;
  auto_load: boolean;
}

interface MarketplaceCardProps {
  marketplace: MarketplaceWithScope;
  isReadOnly: boolean;
  onToggleAutoLoad?: (enabled: boolean) => void;
}

const scopeColors = {
  instance: "bg-purple-500/20 text-purple-400",
  org: "bg-cyan-500/20 text-cyan-400",
  personal: "bg-green-500/20 text-green-400",
};

const scopeIcons = {
  instance: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  ),
  org: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  personal: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
};

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

function MarketplaceCard({
  marketplace,
  isReadOnly,
  onToggleAutoLoad,
}: MarketplaceCardProps) {
  const isAutoLoadEnabled = marketplace.auto_load === "all";
  const scopeKey = `SETTINGS$MARKETPLACE_SCOPE_${marketplace.scope.toUpperCase()}` as I18nKey;

  return (
    <div className="relative bg-tertiary border border-border rounded-lg p-4 group hover:bg-secondary transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center ${scopeColors[marketplace.scope].replace("/20", "/10")}`}
          >
            <div className={scopeColors[marketplace.scope]}>
              {scopeIcons[marketplace.scope]}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{marketplace.name}</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${scopeColors[marketplace.scope]}`}
              >
                {scopeKey}
              </span>
            </div>
            <span className="text-xs text-muted font-mono">
              {marketplace.source}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted">Auto-load</span>
            <div className="flex items-center gap-2 justify-end">
              <span
                className={`text-sm ${isAutoLoadEnabled ? "text-green-400" : "text-yellow-400"}`}
              >
                {isAutoLoadEnabled
                  ? "SETTINGS$MARKETPLACE_ENABLED"
                  : "SETTINGS$MARKETPLACE_DISABLED"}
              </span>
              {isReadOnly ? (
                <div className="w-10 h-[22px] rounded-full bg-border opacity-50" />
              ) : (
                <SettingsSwitch
                  isToggled={isAutoLoadEnabled}
                  onToggle={onToggleAutoLoad}
                >
                  <></>
                </SettingsSwitch>
              )}
            </div>
          </div>
          {isReadOnly && (
            <div className="text-muted" title="Read-only">
              <LockIcon />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketplaceModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MarketplaceRegistration) => void;
  initialData?: MarketplaceRegistration;
  title: I18nKey;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState<MarketplaceFormData>({
    source: "",
    name: "",
    ref: "",
    repo_path: "",
    auto_load: false,
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        source: initialData.source,
        name: initialData.name,
        ref: initialData.ref || "",
        repo_path: initialData.repo_path || "",
        auto_load: initialData.auto_load === "all",
      });
    } else {
      setFormData({
        source: "",
        name: "",
        ref: "",
        repo_path: "",
        auto_load: false,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const registration: MarketplaceRegistration = {
      source: formData.source,
      name: formData.name || formData.source.split("/").pop() || formData.source,
      ref: formData.ref || null,
      repo_path: formData.repo_path || null,
      auto_load: formData.auto_load ? "all" : null,
    };
    onSave(registration);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-tertiary border border-border rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-secondary transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              {t(I18nKey.SETTINGS$MARKETPLACE_SOURCE)} *
            </label>
            <input
              type="text"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text placeholder:text-muted focus:outline-none focus:border-primary"
              placeholder={t(I18nKey.SETTINGS$MARKETPLACE_SOURCE_PLACEHOLDER)}
              value={formData.source}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, source: e.target.value }))
              }
              required
            />
            <p className="text-xs text-muted mt-1">
              {t(I18nKey.SETTINGS$MARKETPLACE_SOURCE_HELP)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              {t(I18nKey.SETTINGS$MARKETPLACE_NAME)}
            </label>
            <input
              type="text"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text placeholder:text-muted focus:outline-none focus:border-primary"
              placeholder={t(I18nKey.SETTINGS$MARKETPLACE_NAME_PLACEHOLDER)}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <p className="text-xs text-muted mt-1">
              {t(I18nKey.SETTINGS$MARKETPLACE_NAME_HELP)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              {t(I18nKey.SETTINGS$MARKETPLACE_REF)}
            </label>
            <input
              type="text"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text placeholder:text-muted focus:outline-none focus:border-primary"
              placeholder={t(I18nKey.SETTINGS$MARKETPLACE_REF_PLACEHOLDER)}
              value={formData.ref}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ref: e.target.value }))
              }
            />
            <p className="text-xs text-muted mt-1">
              {t(I18nKey.SETTINGS$MARKETPLACE_REF_HELP)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              {t(I18nKey.SETTINGS$MARKETPLACE_REPO_PATH)}
            </label>
            <input
              type="text"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text placeholder:text-muted focus:outline-none focus:border-primary"
              placeholder={t(I18nKey.SETTINGS$MARKETPLACE_REPO_PATH_PLACEHOLDER)}
              value={formData.repo_path}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, repo_path: e.target.value }))
              }
            />
            <p className="text-xs text-muted mt-1">
              {t(I18nKey.SETTINGS$MARKETPLACE_REPO_PATH_HELP)}
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <span className="text-sm font-medium">
                {t(I18nKey.SETTINGS$MARKETPLACE_AUTO_LOAD)}
              </span>
              <p className="text-xs text-muted">
                {t(I18nKey.SETTINGS$MARKETPLACE_AUTO_LOAD_HELP)}
              </p>
            </div>
            <SettingsSwitch
              isToggled={formData.auto_load}
              onToggle={(enabled) =>
                setFormData((prev) => ({ ...prev, auto_load: enabled }))
              }
            >
              <></>
            </SettingsSwitch>
          </div>

          <div className="flex gap-3 pt-4">
            <BrandButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t(I18nKey.SETTINGS$MARKETPLACE_CANCEL)}
            </BrandButton>
            <BrandButton
              type="submit"
              variant="primary"
              className="flex-1"
            >
              {t(I18nKey.SETTINGS$MARKETPLACE_SAVE)}
            </BrandButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  marketplaceName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  marketplaceName: string;
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-tertiary border border-border rounded-xl w-full max-w-sm p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t(I18nKey.SETTINGS$MARKETPLACE_DELETE_CONFIRM)}
          </h3>
          <p className="text-sm text-muted mb-6">
            {t(I18nKey.SETTINGS$MARKETPLACE_DELETE_MESSAGE, {
              name: marketplaceName,
            })}
          </p>

          <div className="flex gap-3">
            <BrandButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t(I18nKey.SETTINGS$MARKETPLACE_CANCEL)}
            </BrandButton>
            <BrandButton
              type="button"
              variant="danger"
              onClick={onConfirm}
              className="flex-1"
            >
              {t(I18nKey.SETTINGS$MARKETPLACE_DELETE)}
            </BrandButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceSettingsScreen() {
  const { t } = useTranslation();
  const { mutate: saveSettings, isPending } = useSaveSettings();
  const { data: settings, isLoading } = useSettings();

  const [personalMarketplaces, setPersonalMarketplaces] = React.useState<
    MarketplaceRegistration[]
  >([]);
  const [inheritedMarketplaces, setInheritedMarketplaces] = React.useState<
    MarketplaceWithScope[]
  >([]);

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingMarketplace, setEditingMarketplace] = React.useState<
    MarketplaceRegistration | undefined
  >();
  const [deletingMarketplace, setDeletingMarketplace] = React.useState<
    MarketplaceRegistration | undefined
  >();

  // Sync with server settings
  React.useEffect(() => {
    if (settings) {
      setPersonalMarketplaces(settings.registered_marketplaces || []);
      setInheritedMarketplaces(settings.inherited_marketplaces || []);
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings(
      { registered_marketplaces: personalMarketplaces },
      {
        onSuccess: () => {
          displaySuccessToast(t(I18nKey.SETTINGS$SAVED));
        },
        onError: (error) => {
          const errorMessage = retrieveAxiosErrorMessage(error);
          displayErrorToast(errorMessage || t(I18nKey.ERROR$GENERIC));
        },
      },
    );
  };

  const handleToggleAutoLoad = (
    marketplace: MarketplaceRegistration,
    enabled: boolean,
  ) => {
    const updated = {
      ...marketplace,
      auto_load: enabled ? ("all" as const) : null,
    };
    setPersonalMarketplaces((prev) =>
      prev.map((m) => (m.name === marketplace.name ? updated : m)),
    );
  };

  const handleSaveMarketplace = (data: MarketplaceRegistration) => {
    if (editingMarketplace) {
      // Edit existing
      setPersonalMarketplaces((prev) =>
        prev.map((m) => (m.name === editingMarketplace.name ? data : m)),
      );
      setEditingMarketplace(undefined);
    } else {
      // Add new
      setPersonalMarketplaces((prev) => [...prev, data]);
    }
  };

  const handleDeleteMarketplace = () => {
    if (deletingMarketplace) {
      setPersonalMarketplaces((prev) =>
        prev.filter((m) => m.name !== deletingMarketplace.name),
      );
      setDeletingMarketplace(undefined);
    }
  };

  const handleOpenEdit = (marketplace: MarketplaceRegistration) => {
    setEditingMarketplace(marketplace);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingMarketplace(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-tertiary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs mb-4">{t(I18nKey.SETTINGS$MARKETPLACE_DESCRIPTION)}</p>

      {/* Inherited Marketplaces */}
      {inheritedMarketplaces.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            {t(I18nKey.SETTINGS$MARKETPLACE_INHERITED_TITLE)}
          </h2>
          <div className="space-y-2">
            {inheritedMarketplaces.map((marketplace) => (
              <MarketplaceCard
                key={marketplace.name}
                marketplace={marketplace}
                isReadOnly
              />
            ))}
          </div>
        </div>
      )}

      {/* Personal Marketplaces */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            {t(I18nKey.SETTINGS$MARKETPLACE_PERSONAL_TITLE)}
          </h2>
          <BrandButton
            variant="primary"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            startContent={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            {t(I18nKey.SETTINGS$MARKETPLACE_ADD)}
          </BrandButton>
        </div>

        <div className="space-y-2">
          {personalMarketplaces.map((marketplace) => (
            <div
              key={marketplace.name}
              className="bg-tertiary border border-border rounded-lg p-4 group hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center text-green-400">
                    {scopeIcons.personal}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {marketplace.name}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                        {t(I18nKey.SETTINGS$MARKETPLACE_SCOPE_PERSONAL)}
                      </span>
                    </div>
                    <span className="text-xs text-muted font-mono">
                      {marketplace.source}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-muted">Auto-load</span>
                    <div className="flex items-center gap-2 justify-end">
                      <span
                        className={`text-sm ${
                          marketplace.auto_load === "all"
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {marketplace.auto_load === "all"
                          ? t(I18nKey.SETTINGS$MARKETPLACE_ENABLED)
                          : t(I18nKey.SETTINGS$MARKETPLACE_DISABLED)}
                      </span>
                      <SettingsSwitch
                        isToggled={marketplace.auto_load === "all"}
                        onToggle={(enabled) =>
                          handleToggleAutoLoad(marketplace, enabled)
                        }
                      >
                        <></>
                      </SettingsSwitch>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(marketplace)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-secondary transition-colors"
                      title="Edit"
                    >
                      <svg
                        className="w-4 h-4 text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingMarketplace(marketplace)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-secondary transition-colors hover:text-red-500"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4 text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {personalMarketplaces.length === 0 && (
            <div className="bg-tertiary border border-dashed border-border rounded-lg p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-muted mb-4">
                {t(I18nKey.SETTINGS$MARKETPLACE_NO_PERSONAL)}
              </p>
              <BrandButton
                variant="primary"
                type="button"
                onClick={() => setIsAddModalOpen(true)}
              >
                {t(I18nKey.SETTINGS$MARKETPLACE_ADD_FIRST)}
              </BrandButton>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <MarketplaceModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveMarketplace}
        initialData={editingMarketplace}
        title={
          editingMarketplace
            ? I18nKey.SETTINGS$MARKETPLACE_EDIT_TITLE
            : I18nKey.SETTINGS$MARKETPLACE_ADD_TITLE
        }
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingMarketplace}
        onClose={() => setDeletingMarketplace(undefined)}
        onConfirm={handleDeleteMarketplace}
        marketplaceName={deletingMarketplace?.name || ""}
      />

      {/* Save Button */}
      <div className="flex gap-6 p-6 justify-end">
        <BrandButton
          variant="primary"
          type="button"
          isDisabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving..." : t(I18nKey.SETTINGS$SAVE_CHANGES)}
        </BrandButton>
      </div>
    </div>
  );
}
