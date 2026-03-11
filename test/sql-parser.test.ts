import { describe, it, expect } from "vitest";
import { buildSchema } from "../src/parser/sql.js";

describe("buildSchema", () => {
  it("parses CREATE TABLE with columns", () => {
    const schema = buildSchema([
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email TEXT UNIQUE
      );`,
    ]);

    expect(schema.tables.size).toBe(1);
    const users = schema.tables.get("users")!;
    expect(users.columns).toHaveLength(3);
    expect(users.columns[0]).toMatchObject({
      name: "id",
      type: "serial",
      primaryKey: true,
    });
    expect(users.columns[1]).toMatchObject({
      name: "name",
      type: "varchar(100)",
      nullable: false,
    });
    expect(users.columns[2]).toMatchObject({
      name: "email",
      type: "text",
      unique: true,
    });
  });

  it("parses inline foreign key references", () => {
    const schema = buildSchema([
      "CREATE TABLE departments (id SERIAL PRIMARY KEY);",
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER REFERENCES departments(id)
      );`,
    ]);

    const users = schema.tables.get("users")!;
    expect(users.foreignKeys).toHaveLength(1);
    expect(users.foreignKeys[0]).toMatchObject({
      columns: ["dept_id"],
      referencedTable: "departments",
      referencedColumns: ["id"],
    });
  });

  it("parses table-level constraints", () => {
    const schema = buildSchema([
      `CREATE TABLE orders (
        id SERIAL,
        user_id INTEGER NOT NULL,
        CONSTRAINT orders_pk PRIMARY KEY (id),
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
      );`,
    ]);

    const orders = schema.tables.get("orders")!;
    expect(orders.primaryKey).toContain("id");
    expect(orders.foreignKeys).toHaveLength(1);
    expect(orders.foreignKeys[0].referencedTable).toBe("users");
  });

  it("handles ALTER TABLE ADD COLUMN", () => {
    const schema = buildSchema([
      "CREATE TABLE users (id SERIAL PRIMARY KEY);",
      "ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL;",
    ]);

    const users = schema.tables.get("users")!;
    expect(users.columns).toHaveLength(2);
    expect(users.columns[1]).toMatchObject({
      name: "name",
      type: "varchar(100)",
      nullable: false,
    });
  });

  it("handles ALTER TABLE ADD CONSTRAINT", () => {
    const schema = buildSchema([
      `CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT
      );`,
      "ALTER TABLE users ADD CONSTRAINT uq_email UNIQUE (email);",
    ]);

    const users = schema.tables.get("users")!;
    expect(users.uniqueConstraints).toHaveLength(1);
    const emailCol = users.columns.find((c) => c.name === "email")!;
    expect(emailCol.unique).toBe(true);
  });

  it("handles DROP TABLE", () => {
    const schema = buildSchema([
      "CREATE TABLE temp (id SERIAL);",
      "CREATE TABLE users (id SERIAL);",
      "DROP TABLE IF EXISTS temp;",
    ]);

    expect(schema.tables.size).toBe(1);
    expect(schema.tables.has("users")).toBe(true);
    expect(schema.tables.has("temp")).toBe(false);
  });

  it("handles composite primary keys", () => {
    const schema = buildSchema([
      `CREATE TABLE project_members (
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (project_id, user_id)
      );`,
    ]);

    const pm = schema.tables.get("project_members")!;
    expect(pm.primaryKey).toEqual(["project_id", "user_id"]);
  });

  it("skips unparseable SQL gracefully", () => {
    const schema = buildSchema([
      "CREATE TABLE users (id SERIAL PRIMARY KEY);",
      "INSERT INTO users (id) VALUES (1);", // should not crash
      "GRANT ALL ON users TO admin;", // should not crash
    ]);

    expect(schema.tables.size).toBe(1);
  });

  it("parses CREATE TABLE even when mixed with unparseable statements in same file", () => {
    const schema = buildSchema([
      `
        CREATE INDEX idx_users_email ON users (email);
        CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL);
        DO $$ BEGIN RAISE NOTICE 'hello'; END $$;
        CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TYPE status_enum AS ENUM ('active', 'inactive');
      `,
    ]);

    expect(schema.tables.size).toBe(2);
    expect(schema.tables.has("orders")).toBe(true);
    expect(schema.tables.has("products")).toBe(true);
  });

  it("handles dollar-quoted strings in unparseable statements", () => {
    const schema = buildSchema([
      `
        CREATE OR REPLACE FUNCTION test_func() RETURNS void AS $$
        BEGIN
          INSERT INTO log (msg) VALUES ('test; with semicolons');
        END;
        $$ LANGUAGE plpgsql;
        CREATE TABLE events (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
      `,
    ]);

    expect(schema.tables.size).toBe(1);
    expect(schema.tables.has("events")).toBe(true);
  });
});
