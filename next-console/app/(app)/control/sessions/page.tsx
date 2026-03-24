import type { Metadata } from "next";
import { SessionsClient } from "./sessions-client";

export const metadata: Metadata = { title: "会话" };

export default function ControlSessionsPage() {
  return <SessionsClient />;
}
