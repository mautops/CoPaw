import type { Metadata } from "next";
import { CronJobsClient } from "./cron-jobs-client";

export const metadata: Metadata = { title: "定时任务" };

export default function ControlCronJobsPage() {
  return <CronJobsClient />;
}
