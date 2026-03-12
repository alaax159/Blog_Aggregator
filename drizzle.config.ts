import { defineConfig } from "drizzle-kit";
import fs from "fs";
import os from "os";
import path from "path";

type RawConfig = {
  db_url?: unknown;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function getDbUrl(): string {
  const p = getConfigFilePath();
  const rawText = fs.readFileSync(p, "utf-8");
  const parsed: RawConfig = JSON.parse(rawText);

  if (typeof parsed.db_url !== "string" || parsed.db_url.length === 0) {
    throw new Error("db_url missing/invalid in ~/.gatorconfig.json");
  }

  return parsed.db_url as string;
}

export default defineConfig({
  schema: "src/lib/db/schema.ts",
  out: "src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
  },
});