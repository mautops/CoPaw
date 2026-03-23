import type { Metadata } from "next";

export const metadata: Metadata = { title: "堡垒机" };

export default function BastionPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground">堡垒机</p>
    </main>
  );
}
