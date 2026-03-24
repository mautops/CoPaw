import type { Metadata } from "next";
import { AgentConfigClient } from "./config-client";

export const metadata: Metadata = { title: "智能体配置" };

export default function AgentConfigPage() {
  return <AgentConfigClient />;
}
