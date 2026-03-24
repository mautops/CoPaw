import type { Metadata } from "next";
import { ModelsSettingsClient } from "./models-client";

export const metadata: Metadata = { title: "模型" };

export default function SettingsModelsPage() {
  return <ModelsSettingsClient />;
}
