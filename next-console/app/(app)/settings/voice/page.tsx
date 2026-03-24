import type { Metadata } from "next";
import { VoiceClient } from "./voice-client";

export const metadata: Metadata = { title: "语音转写" };

export default function SettingsVoicePage() {
  return <VoiceClient />;
}
