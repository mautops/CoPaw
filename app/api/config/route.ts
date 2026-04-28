import { NextResponse } from "next/server";
import { WORKING_DIR } from "@/lib/copaw-paths";

// GET /api/config — exposes server-side resolved paths for client use
export async function GET() {
  return NextResponse.json({ working_dir: WORKING_DIR });
}
