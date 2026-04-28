import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKING_DIR } from "@/lib/copaw-paths";

type DocItem =
  | { type: "file"; name: string; filename: string; title: string }
  | { type: "dir"; name: string; children: DocItem[] };

function scanDocs(dir: string): DocItem[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items: DocItem[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const children = scanDocs(fullPath);
      if (children.length > 0) {
        items.push({ type: "dir", name: entry.name, children });
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relPath = path.relative(path.join(WORKING_DIR, "docs"), fullPath);
      items.push({
        type: "file",
        name: entry.name,
        filename: relPath,
        title: entry.name.replace(/\.md$/, ""),
      });
    }
  }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}

export async function GET() {
  const docsDir = path.join(WORKING_DIR, "docs");
  let items: DocItem[] = [];
  try {
    items = scanDocs(docsDir);
  } catch {
    // docs dir doesn't exist yet — return empty list
  }
  return NextResponse.json({ docs: items });
}
