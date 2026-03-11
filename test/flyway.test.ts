import { describe, it, expect } from "vitest";
import { parseFlywayVersion, readFlywayMigrations } from "../src/parser/flyway.js";
import { join } from "node:path";

describe("parseFlywayVersion", () => {
  it("parses simple version", () => {
    const result = parseFlywayVersion("V1__create_users.sql");
    expect(result).toEqual({ version: 1, description: "create users" });
  });

  it("parses multi-part version", () => {
    const result = parseFlywayVersion("V1.2.3__add_columns.sql");
    expect(result).toEqual({ version: 1002003, description: "add columns" });
  });

  it("returns null for non-flyway files", () => {
    expect(parseFlywayVersion("R__repeatable.sql")).toBeNull();
    expect(parseFlywayVersion("random.sql")).toBeNull();
    expect(parseFlywayVersion("README.md")).toBeNull();
  });

  it("is case insensitive", () => {
    const result = parseFlywayVersion("v5__UPPERCASE.sql");
    expect(result).not.toBeNull();
    expect(result!.version).toBe(5);
  });
});

describe("readFlywayMigrations", () => {
  const fixturesDir = join(import.meta.dirname, "fixtures");

  it("reads and sorts migration files", async () => {
    const migrations = await readFlywayMigrations(fixturesDir);
    expect(migrations).toHaveLength(5);
    expect(migrations[0].version).toBe(1);
    expect(migrations[1].version).toBe(2);
    expect(migrations[2].version).toBe(3);
    expect(migrations[3].version).toBe(4);
    expect(migrations[4].version).toBe(5);
  });

  it("includes SQL content", async () => {
    const migrations = await readFlywayMigrations(fixturesDir);
    expect(migrations[0].sql).toContain("CREATE TABLE departments");
  });
});
