import type { Metadata } from "next";
import { AppStubPage } from "@/components/layout/app-stub-page";

export const metadata: Metadata = { title: "虚拟机" };

export default function VmPage() {
  return (
    <AppStubPage
      title="虚拟机"
      description="虚拟机申请与编排为 Hi-Ops 扩展能力, 当前控制台未对接. 请沿用组织内既有流程或联系平台管理员."
      links={[{ href: "/dashboard", label: "工作台" }]}
    />
  );
}
