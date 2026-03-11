import { describe, it, expect } from "vitest";
import { generateMermaid } from "../src/generator/mermaid.js";
import { buildSchema } from "../src/parser/sql.js";

describe("generateMermaid", () => {
  it("generates basic ER diagram", () => {
    const schema = buildSchema([
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );`,
    ]);

    const output = generateMermaid(schema);
    expect(output).toContain("erDiagram");
    expect(output).toContain("users {");
    expect(output).toContain("serial id PK");
    expect(output).toContain('varchar_100 name "NOT NULL"');
  });

  it("renders foreign key relationships", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER REFERENCES departments(id)
      );`,
    ]);

    const output = generateMermaid(schema);
    expect(output).toContain("departments");
    expect(output).toContain("users");
    // Should show a relationship line
    expect(output).toMatch(/departments .+\S.+ users/);
  });

  it("marks FK columns", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER REFERENCES departments(id)
      );`,
    ]);

    const output = generateMermaid(schema);
    expect(output).toContain("FK");
  });

  it("handles multiple tables with relationships", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        department_id INTEGER REFERENCES departments(id)
      );`,
      `CREATE TABLE projects (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id)
      );`,
    ]);

    const output = generateMermaid(schema);
    expect(output).toContain("departments");
    expect(output).toContain("users");
    expect(output).toContain("projects");
    // Two relationships
    const relationshipLines = output.split("\n").filter((l) => l.includes("||"));
    expect(relationshipLines.length).toBe(2);
  });

  it("uses correct cardinality for nullable FK (zero-or-many)", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER REFERENCES departments(id)
      );`,
    ]);

    const output = generateMermaid(schema);
    // Nullable FK => optional many: ||--o{
    expect(output).toContain("||--o{");
  });

  it("uses correct cardinality for non-nullable FK (one-or-many)", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER NOT NULL REFERENCES departments(id)
      );`,
    ]);

    const output = generateMermaid(schema);
    // Non-nullable FK => mandatory many: ||--|{
    expect(output).toContain("||--|{");
  });
});
