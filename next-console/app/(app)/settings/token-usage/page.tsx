import type { Metadata } from "next";
import { TokenUsageClient } from "./token-usage-client";

export const metadata: Metadata = { title: "Token 用量" };

export default function SettingsTokenUsagePage() {
  return <TokenUsageClient />;
}
