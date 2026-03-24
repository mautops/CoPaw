const API_BASE = "/api/copaw";

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type AudioMode = "auto" | "native";

export type TranscriptionProviderType =
  | "disabled"
  | "whisper_api"
  | "local_whisper";

export interface LocalWhisperStatus {
  available: boolean;
  ffmpeg_installed: boolean;
  whisper_installed: boolean;
}

export interface TranscriptionProviderOption {
  id: string;
  name: string;
  available: boolean;
}

export interface TranscriptionProvidersResponse {
  providers: TranscriptionProviderOption[];
  configured_provider_id: string;
}

export const voiceSettingsApi = {
  getAudioMode: () =>
    apiRequest<{ audio_mode: AudioMode }>("/agent/audio-mode"),
  putAudioMode: (audio_mode: AudioMode) =>
    apiRequest<{ audio_mode: AudioMode }>("/agent/audio-mode", {
      method: "PUT",
      body: JSON.stringify({ audio_mode }),
    }),
  getTranscriptionProviderType: () =>
    apiRequest<{ transcription_provider_type: TranscriptionProviderType }>(
      "/agent/transcription-provider-type",
    ),
  putTranscriptionProviderType: (
    transcription_provider_type: TranscriptionProviderType,
  ) =>
    apiRequest<{ transcription_provider_type: TranscriptionProviderType }>(
      "/agent/transcription-provider-type",
      {
        method: "PUT",
        body: JSON.stringify({ transcription_provider_type }),
      },
    ),
  getLocalWhisperStatus: () =>
    apiRequest<LocalWhisperStatus>("/agent/local-whisper-status"),
  getTranscriptionProviders: () =>
    apiRequest<TranscriptionProvidersResponse>(
      "/agent/transcription-providers",
    ),
  putTranscriptionProvider: (provider_id: string) =>
    apiRequest<{ provider_id: string }>("/agent/transcription-provider", {
      method: "PUT",
      body: JSON.stringify({ provider_id }),
    }),
};
