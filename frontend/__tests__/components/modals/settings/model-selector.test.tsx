import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CUSTOM_LLM_PROVIDER,
  ModelSelector,
} from "#/components/shared/modals/settings/model-selector";
import type {
  LLMProvider,
  LLMModel,
} from "#/api/config-service/config-service.types";

const mockProviders: LLMProvider[] = [
  { name: "openhands", verified: true },
  { name: "openai", verified: true },
  { name: "azure", verified: false },
  { name: "vertex_ai", verified: false },
];

const mockModelsByProvider: Record<string, LLMModel[]> = {
  openhands: [{ provider: "openhands", name: "claude-sonnet", verified: true }],
  openai: [
    { provider: "openai", name: "gpt-4o", verified: true },
    { provider: "openai", name: "gpt-4o-mini", verified: true },
  ],
  azure: [
    { provider: "azure", name: "ada", verified: false },
    { provider: "azure", name: "gpt-35-turbo", verified: false },
  ],
  vertex_ai: [
    { provider: "vertex_ai", name: "chat-bison", verified: false },
    { provider: "vertex_ai", name: "chat-bison-32k", verified: false },
  ],
};

vi.mock("#/hooks/query/use-search-providers", () => ({
  useSearchProviders: () => ({ data: mockProviders }),
}));

vi.mock("#/hooks/query/use-provider-models", () => ({
  useProviderModels: (provider: string | null) => ({
    data: provider ? (mockModelsByProvider[provider] ?? []) : [],
  }),
}));

let mockConfig: Record<string, unknown> = {
  app_mode: "oss",
  feature_flags: {},
};

vi.mock("#/hooks/query/use-config", () => ({
  useConfig: () => ({ data: mockConfig, isLoading: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        LLM$PROVIDER: "LLM Provider",
        LLM$MODEL: "LLM Model",
        LLM$SELECT_PROVIDER_PLACEHOLDER: "Select a provider",
        LLM$SELECT_MODEL_PLACEHOLDER: "Select a model",
        SETTINGS$ADMIN_MANAGED_PROVIDER: "Default",
        SETTINGS$CUSTOM_LLM_PROVIDER: "Custom LLM Provider",
        SETTINGS$ADMIN_MANAGED_MODELS_HELP:
          "These models are configured for this OpenHands Enterprise instance by your administrator.",
        SETTINGS$NEED_OPENHANDS_ACCOUNT: "Need an OpenHands Account?",
        SETTINGS$CLICK_HERE: "Click here",
      };
      return translations[key] || key;
    },
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ModelSelector", () => {
  beforeEach(() => {
    mockConfig = {
      app_mode: "oss",
      feature_flags: {},
    };
  });

  it("should display the provider selector", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ModelSelector />);

    const selector = screen.getByLabelText("LLM Provider");
    expect(selector).toBeInTheDocument();

    await user.click(selector);

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Azure")).toBeInTheDocument();
    expect(screen.getByText("VertexAI")).toBeInTheDocument();
  });

  it("labels managed OpenHands models as Default in OHE", async () => {
    mockConfig = {
      app_mode: "saas",
      feature_flags: { deployment_mode: "self_hosted" },
    };

    const user = userEvent.setup();
    renderWithQuery(<ModelSelector />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);
    await user.click(screen.getByText("Default"));

    expect(screen.getByLabelText("LLM Provider")).toHaveValue("Default");
    expect(screen.getByTestId("admin-managed-models-help")).toHaveTextContent(
      "These models are configured for this OpenHands Enterprise instance by your administrator.",
    );
    expect(
      screen.queryByTestId("openhands-account-help"),
    ).not.toBeInTheDocument();
  });

  it("labels managed OpenHands models as Default on all-hands.dev test installs", async () => {
    mockConfig = {
      app_mode: "saas",
      feature_flags: { deployment_mode: "cloud" },
      managed_litellm_base_url: "http://openhands-litellm:4000",
    };

    const user = userEvent.setup();
    renderWithQuery(<ModelSelector />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);
    await user.click(screen.getByText("Default"));

    expect(screen.getByLabelText("LLM Provider")).toHaveValue("Default");
    expect(
      screen.queryByTestId("openhands-account-help"),
    ).not.toBeInTheDocument();
  });

  it("should disable the model selector if the provider is not selected", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ModelSelector />);

    const modelSelector = screen.getByLabelText("LLM Model");
    expect(modelSelector).toBeDisabled();

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);

    const vertexAI = screen.getByText("VertexAI");
    await user.click(vertexAI);

    expect(modelSelector).not.toBeDisabled();
  });

  it("should display the model selector", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ModelSelector />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);

    const azureProvider = screen.getByText("Azure");
    await user.click(azureProvider);

    const modelSelector = screen.getByLabelText("LLM Model");
    await user.click(modelSelector);

    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByText("gpt-35-turbo")).toBeInTheDocument();
  });

  it("should call onChange when the provider and model change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithQuery(<ModelSelector onChange={onChange} />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);
    await user.click(screen.getByText("Azure"));

    const modelSelector = screen.getByLabelText("LLM Model");
    await user.click(modelSelector);
    await user.click(screen.getByText("ada"));

    expect(onChange).toHaveBeenNthCalledWith(1, "azure", null);
    expect(onChange).toHaveBeenNthCalledWith(2, "azure", "ada");
  });

  it("should have a default value if passed", async () => {
    renderWithQuery(<ModelSelector currentModel="azure/ada" />);

    await waitFor(() => {
      expect(screen.getByLabelText("LLM Provider")).toHaveValue("Azure");
      expect(screen.getByLabelText("LLM Model")).toHaveValue("ada");
    });
  });

  it("should stretch the provider and model selectors across the full row", () => {
    const { container } = renderWithQuery(<ModelSelector />);

    expect(container.firstChild).toHaveClass("w-full");
  });

  it("restricts the provider list to Default when managedProviderOnly is enabled", async () => {
    mockConfig = {
      app_mode: "saas",
      feature_flags: { deployment_mode: "self_hosted" },
    };

    const user = userEvent.setup();
    renderWithQuery(<ModelSelector managedProviderOnly allowCustomProvider />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);

    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
    expect(screen.queryByText("Azure")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom LLM Provider")).not.toBeInTheDocument();
  });

  it("offers Custom LLM Provider and hides model selection when selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQuery(<ModelSelector allowCustomProvider onChange={onChange} />);

    const providerSelector = screen.getByLabelText("LLM Provider");
    await user.click(providerSelector);
    await user.click(screen.getByText("Custom LLM Provider"));

    expect(onChange).toHaveBeenCalledWith(CUSTOM_LLM_PROVIDER, null);
    expect(screen.getByLabelText("LLM Provider")).toHaveValue(
      "Custom LLM Provider",
    );
    expect(screen.queryByLabelText("LLM Model")).not.toBeInTheDocument();
  });
});
