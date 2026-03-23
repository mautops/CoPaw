import type { Metadata } from "next";

export const metadata: Metadata = { title: "虚拟机" };

export default function VmPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground">虚拟机</p>
    </main>
  );
}
