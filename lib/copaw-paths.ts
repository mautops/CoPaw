import path from "path";
import os from "os";
import fs from "fs";

export const COPAW_HOME = process.env.COPAW_HOME ?? os.homedir();

function resolveWorkingDir(): string {
  if (process.env.QWENPAW_WORKING_DIR) return process.env.QWENPAW_WORKING_DIR;
  if (process.env.COPAW_WORKING_DIR) return process.env.COPAW_WORKING_DIR;
  const legacy = path.join(os.homedir(), ".copaw");
  if (fs.existsSync(legacy)) return legacy;
  return path.join(os.homedir(), ".qwenpaw");
}

export const WORKING_DIR = resolveWorkingDir();
