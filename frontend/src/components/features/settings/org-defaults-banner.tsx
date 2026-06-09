import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { useConfig } from "#/hooks/query/use-config";
import {
  allowsUserLlmConfiguration,
  isOheManagedMode,
} from "#/utils/ohe-managed-mode";

export function OrgDefaultsBanner() {
  const { t } = useTranslation();
  const { data: config } = useConfig();
  const infoKey =
    isOheManagedMode(config) && !allowsUserLlmConfiguration(config)
      ? I18nKey.SETTINGS$ORG_DEFAULTS_MANAGED_ONLY_INFO
      : I18nKey.SETTINGS$ORG_DEFAULTS_INFO;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tertiary-alt">{t(infoKey)}</p>
    </div>
  );
}
