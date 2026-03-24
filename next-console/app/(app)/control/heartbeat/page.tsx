import type { Metadata } from "next";
import { HeartbeatClient } from "./heartbeat-client";

export const metadata: Metadata = { title: "心跳" };

export default function ControlHeartbeatPage() {
  return <HeartbeatClient />;
}
