import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKING_DIR } from "@/lib/copaw-paths";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> },
) {
  const { filename } = await params;
  const relPath = filename.join("/");
  const filePath = path.join(WORKING_DIR, "docs", relPath);

  if (!filePath.startsWith(path.join(WORKING_DIR, "docs"))) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  if (!relPath.endsWith(".md")) {
    return NextResponse.json({ error: "not a markdown file" }, { status: 400 });
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json({ filename: relPath, content });
}
