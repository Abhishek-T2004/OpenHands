import { openHands } from "../open-hands-axios";

export type AgentKind = "openhands" | "acp";

export interface LlmProfileSummary {
  name: string;
  agent_kind: AgentKind;
  model: string | null;
  acp_server: string | null;
  acp_model: string | null;
  base_url: string | null;
  api_key_set: boolean;
}

// Not exported — only `listProfiles` reads it as its response shape.
interface LlmProfileListResponse {
  profiles: LlmProfileSummary[];
  active_profile: string | null;
}

export interface AgentProfilePayload {
  agent_kind: AgentKind;
  model?: string;
  api_key?: string | null;
  base_url?: string | null;
  acp_server?: string | null;
  acp_model?: string | null;
}

export interface SaveLlmProfileRequest {
  include_secrets?: boolean;
  /** Explicit agent profile (OpenHands or ACP). Takes precedence over ``llm``. */
  profile?: AgentProfilePayload;
  /** Legacy field for backward compatibility — treated as an OpenHands profile. */
  llm?: {
    model: string;
    base_url?: string | null;
    api_key?: string | null;
  } & Record<string, unknown>;
}

class ProfilesService {
  static async listProfiles(): Promise<LlmProfileListResponse> {
    const { data } = await openHands.get<LlmProfileListResponse>(
      "/api/v1/settings/profiles",
    );
    return data;
  }

  static async saveProfile(
    name: string,
    request: SaveLlmProfileRequest = {},
  ): Promise<void> {
    await openHands.post(
      `/api/v1/settings/profiles/${encodeURIComponent(name)}`,
      request,
    );
  }

  static async deleteProfile(name: string): Promise<void> {
    await openHands.delete(
      `/api/v1/settings/profiles/${encodeURIComponent(name)}`,
    );
  }

  static async activateProfile(name: string): Promise<void> {
    await openHands.post(
      `/api/v1/settings/profiles/${encodeURIComponent(name)}/activate`,
    );
  }

  static async renameProfile(name: string, newName: string): Promise<void> {
    await openHands.post(
      `/api/v1/settings/profiles/${encodeURIComponent(name)}/rename`,
      { new_name: newName },
    );
  }
}

export default ProfilesService;
