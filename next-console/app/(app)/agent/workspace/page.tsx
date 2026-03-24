import type { Metadata } from "next";
import { WorkspaceClient } from "./workspace-client";

export const metadata: Metadata = { title: "工作区" };

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
