#!/usr/bin/env node

import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { readFlywayMigrations } from "./parser/flyway.js";
import { buildSchema } from "./parser/sql.js";
import { generateMermaid } from "./generator/mermaid.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();

program
  .name("flyway2mermaid")
  .description("Generate Mermaid ER diagrams from Flyway SQL migration files")
  .version(pkg.version)
  .argument("<input-dir>", "Directory containing Flyway migration SQL files")
  .option("-o, --output <file>", "Output file (default: stdout)")
  .action(async (inputDir: string, options: { output?: string }) => {
    try {
      const migrations = await readFlywayMigrations(inputDir);

      if (migrations.length === 0) {
        console.error(`No Flyway migration files found in: ${inputDir}`);
        process.exit(1);
      }

      const sqlStatements = migrations.map((m) => m.sql);
      const schema = buildSchema(sqlStatements);

      if (schema.tables.size === 0) {
        console.error("No tables found in migration files.");
        process.exit(1);
      }

      const mermaid = generateMermaid(schema);

      if (options.output) {
        await writeFile(options.output, mermaid, "utf-8");
        console.error(`Wrote diagram to ${options.output}`);
      } else {
        process.stdout.write(mermaid);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse();
