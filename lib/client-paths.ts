/**
 * Client-side helper for server-resolved filesystem paths.
 *
 * WORKING_DIR is determined server-side (env vars → ~/.copaw legacy → ~/.qwenpaw).
 * Clients must not hard-code the path — use the functions below instead.
 */

let cachedWorkingDir: string | null = null;

async function getWorkingDir(): Promise<string> {
  if (cachedWorkingDir) return cachedWorkingDir;
  const res = await fetch("/api/config");
  const data = (await res.json()) as { working_dir: string };
  cachedWorkingDir = data.working_dir;
  return cachedWorkingDir;
}

export async function checklistWorkflowBase() {
  const base = await getWorkingDir();
  return `${base}/workflows/checklists`;
}
