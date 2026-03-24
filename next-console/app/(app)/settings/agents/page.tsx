import type { Metadata } from "next";
import { AgentsSettingsClient } from "./agents-client";

export const metadata: Metadata = { title: "智能体注册" };

export default function SettingsAgentsPage() {
  return <AgentsSettingsClient />;
}
