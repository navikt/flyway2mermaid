import { describe, it, expect } from "vitest";
import { readFlywayMigrations } from "../src/parser/flyway.js";
import { buildSchema } from "../src/parser/sql.js";
import { generateMermaid } from "../src/generator/mermaid.js";
import { join } from "node:path";

describe("integration: flyway files to mermaid", () => {
  const fixturesDir = join(import.meta.dirname, "fixtures");

  it("generates correct ER diagram from fixture migrations", async () => {
    const migrations = await readFlywayMigrations(fixturesDir);
    const sqlStatements = migrations.map((m) => m.sql);
    const schema = buildSchema(sqlStatements);
    const output = generateMermaid(schema);

    expect(output).toMatchSnapshot();
  });
});
