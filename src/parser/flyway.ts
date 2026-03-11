import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface FlywayMigration {
  version: number;
  description: string;
  filename: string;
  sql: string;
}

const FLYWAY_VERSION_PATTERN = /^V(\d+(?:\.\d+)*)__(.+)\.sql$/i;

export function parseFlywayVersion(
  filename: string,
): { version: number; description: string } | null {
  const match = filename.match(FLYWAY_VERSION_PATTERN);
  if (!match) return null;

  // Convert version like "1.2.3" to a comparable number: 1002003
  const parts = match[1].split(".");
  let version = 0;
  for (let i = 0; i < parts.length; i++) {
    version = version * 1000 + parseInt(parts[i], 10);
  }

  return {
    version,
    description: match[2].replace(/_/g, " "),
  };
}

export async function readFlywayMigrations(dir: string): Promise<FlywayMigration[]> {
  const entries = await readdir(dir);
  const migrations: FlywayMigration[] = [];

  for (const filename of entries) {
    const parsed = parseFlywayVersion(filename);
    if (!parsed) continue;

    const sql = await readFile(join(dir, filename), "utf-8");
    migrations.push({
      version: parsed.version,
      description: parsed.description,
      filename,
      sql,
    });
  }

  migrations.sort((a, b) => a.version - b.version);
  return migrations;
}
