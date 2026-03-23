import type { Metadata } from "next";

export const metadata: Metadata = { title: "基础服务" };

export default function ServicesPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground">基础服务</p>
    </main>
  );
}
