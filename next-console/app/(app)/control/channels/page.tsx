import type { Metadata } from "next";
import { ChannelsClient } from "./channels-client";

export const metadata: Metadata = { title: "通道" };

export default function ControlChannelsPage() {
  return <ChannelsClient />;
}
