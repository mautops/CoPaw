import type { Metadata } from "next";
import { ToolsClient } from "./tools-client";

export const metadata: Metadata = { title: "工具" };

export default function ToolsPage() {
  return <ToolsClient />;
}
