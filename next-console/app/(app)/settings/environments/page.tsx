import type { Metadata } from "next";
import { EnvironmentsClient } from "./environments-client";

export const metadata: Metadata = { title: "环境变量" };

export default function SettingsEnvironmentsPage() {
  return <EnvironmentsClient />;
}
