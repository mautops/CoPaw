import type { Metadata } from "next";
import { McpClientsView } from "./mcp-client";

export const metadata: Metadata = { title: "MCP" };

export default function McpPage() {
  return <McpClientsView />;
}
