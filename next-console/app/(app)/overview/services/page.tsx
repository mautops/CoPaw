import type { Metadata } from "next";
import { AppStubPage } from "@/components/layout/app-stub-page";

export const metadata: Metadata = { title: "基础服务" };

export default function ServicesPage() {
  return (
    <AppStubPage
      title="基础服务"
      description="Hi-Ops 平台预留的基础服务与监控聚合位, 当前未接入独立 API. 请使用侧栏已上线的智能体与控制面功能."
      links={[{ href: "/dashboard", label: "工作台" }]}
    />
  );
}
