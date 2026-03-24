import type { Metadata } from "next";
import { SecurityClient } from "./security-client";

export const metadata: Metadata = { title: "安全" };

export default function SettingsSecurityPage() {
  return <SecurityClient />;
}
