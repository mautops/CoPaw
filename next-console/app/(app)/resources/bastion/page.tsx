import type { Metadata } from "next";
import { AppStubPage } from "@/components/layout/app-stub-page";

export const metadata: Metadata = { title: "堡垒机" };

export default function BastionPage() {
  return (
    <AppStubPage
      title="堡垒机"
      description="堡垒机访问与审计为 Hi-Ops 扩展能力, 当前控制台未对接. 请沿用组织内既有流程或联系平台管理员."
      links={[{ href: "/dashboard", label: "工作台" }]}
    />
  );
}
