import { describe, it, expect } from "vitest";
import { readFlywayMigrations } from "../src/parser/flyway.js";
import { buildSchema } from "../src/parser/sql.js";
import { generateMermaid } from "../src/generator/mermaid.js";
import { join } from "node:path";

describe("integration: flyway files to mermaid", () => {
  const fixturesDir = join(import.meta.dirname, "fixtures");

  it("generates a complete ER diagram from fixture migrations", async () => {
    const migrations = await readFlywayMigrations(fixturesDir);
    const sqlStatements = migrations.map((m) => m.sql);
    const schema = buildSchema(sqlStatements);
    const output = generateMermaid(schema);

    // Should have all 4 tables
    expect(output).toContain("departments {");
    expect(output).toContain("users {");
    expect(output).toContain("projects {");
    expect(output).toContain("project_members {");

    // Should have relationships
    expect(output).toMatch(/departments .+ users/);
    expect(output).toMatch(/users .+ projects/);
    expect(output).toMatch(/projects .+ project_members/);
    expect(output).toMatch(/users .+ project_members/);

    // Users table should have the phone column from V4 migration
    expect(output).toContain("phone");

    // Projects should have status column from V4 migration
    expect(output).toContain("status");

    // Verify it's valid mermaid (starts correctly)
    expect(output.trim()).toMatch(/^erDiagram/);
  });
});
