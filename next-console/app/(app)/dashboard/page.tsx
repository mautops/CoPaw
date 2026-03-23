import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground">Dashboard</p>
    </main>
  );
}
