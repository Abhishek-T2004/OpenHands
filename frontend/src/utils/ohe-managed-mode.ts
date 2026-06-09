import type { WebClientConfig } from "#/api/option-service/option.types";

const CLOUD_LITELLM_PROXY_URLS = new Set([
  "https://llm-proxy.app.all-hands.dev",
  "https://llm-proxy.app.all-hands.dev/v1",
]);

export const normalizeBaseUrl = (baseUrl: string) => {
  try {
    const parsedUrl = new URL(baseUrl);
    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "") || "";
    return `${parsedUrl.origin}${normalizedPath}`;
  } catch {
    return baseUrl.trim().replace(/\/+$/, "");
  }
};

export const isManagedLiteLlmBaseUrl = (
  baseUrl: string | null | undefined,
  managedLiteLlmBaseUrl: string | null | undefined,
) =>
  !!baseUrl &&
  !!managedLiteLlmBaseUrl &&
  normalizeBaseUrl(baseUrl) === normalizeBaseUrl(managedLiteLlmBaseUrl);

export const isOheManagedMode = (
  config: WebClientConfig | null | undefined,
) => {
  if (config?.app_mode !== "saas") {
    return false;
  }

  if (config.feature_flags?.deployment_mode === "self_hosted") {
    return true;
  }

  const managedLiteLlmBaseUrl = config.managed_litellm_base_url?.trim();
  if (!managedLiteLlmBaseUrl) {
    return false;
  }

  return !CLOUD_LITELLM_PROXY_URLS.has(normalizeBaseUrl(managedLiteLlmBaseUrl));
};

export const allowsUserLlmConfiguration = (
  config: WebClientConfig | null | undefined,
) => config?.allow_user_llm_configuration ?? true;
