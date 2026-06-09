import { describe, expect, it } from "vitest";

import {
  allowsUserLlmConfiguration,
  isManagedLiteLlmBaseUrl,
  isOheManagedMode,
  normalizeBaseUrl,
} from "#/utils/ohe-managed-mode";
import type { WebClientConfig } from "#/api/option-service/option.types";

describe("ohe managed mode helpers", () => {
  it("normalizes trailing slashes from base URLs", () => {
    expect(normalizeBaseUrl("http://openhands-litellm:4000/")).toBe(
      "http://openhands-litellm:4000",
    );
    expect(normalizeBaseUrl("https://example.com/v1/")).toBe(
      "https://example.com/v1",
    );
  });

  it("treats saas self-hosted mode as OHE managed", () => {
    expect(
      isOheManagedMode({
        app_mode: "saas",
        feature_flags: { deployment_mode: "self_hosted" },
      } as WebClientConfig),
    ).toBe(true);
  });

  it("treats saas cloud test installs with an internal managed LiteLLM URL as OHE managed", () => {
    expect(
      isOheManagedMode({
        app_mode: "saas",
        feature_flags: { deployment_mode: "cloud" },
        managed_litellm_base_url: "http://openhands-litellm:4000",
      } as WebClientConfig),
    ).toBe(true);
  });

  it("does not treat public cloud SaaS as OHE managed", () => {
    expect(
      isOheManagedMode({
        app_mode: "saas",
        feature_flags: { deployment_mode: "cloud" },
        managed_litellm_base_url: "https://llm-proxy.app.all-hands.dev/v1",
      } as WebClientConfig),
    ).toBe(false);
  });

  it("matches the configured managed LiteLLM URL exactly after normalization", () => {
    expect(
      isManagedLiteLlmBaseUrl(
        "http://openhands-litellm:4000/",
        "http://openhands-litellm:4000",
      ),
    ).toBe(true);
    expect(
      isManagedLiteLlmBaseUrl(
        "https://custom.example/v1",
        "http://openhands-litellm:4000",
      ),
    ).toBe(false);
  });

  it("allows user LLM configuration by default for backwards compatibility", () => {
    expect(allowsUserLlmConfiguration(undefined)).toBe(true);
    expect(
      allowsUserLlmConfiguration({
        app_mode: "saas",
      } as WebClientConfig),
    ).toBe(true);
  });

  it("respects an explicit false user LLM configuration flag", () => {
    expect(
      allowsUserLlmConfiguration({
        app_mode: "saas",
        allow_user_llm_configuration: false,
      } as WebClientConfig),
    ).toBe(false);
  });
});
