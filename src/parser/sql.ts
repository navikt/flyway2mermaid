import { parse, type Statement } from "pgsql-ast-parser";
import {
  type Schema,
  type Column,
  type ForeignKey,
  type Table,
  createSchema,
  createTable,
} from "../model/schema.js";

export function buildSchema(sqlStatements: string[]): Schema {
  const schema = createSchema();

  for (const sql of sqlStatements) {
    applyMigration(schema, sql);
  }

  return schema;
}

function applyMigration(schema: Schema, sql: string): void {
  // Split into individual statements so one unparseable statement
  // doesn't cause the entire migration file to be skipped.
  const rawStatements = splitStatements(sql);

  for (const raw of rawStatements) {
    let statements: Statement[];
    try {
      statements = parse(raw, { locationTracking: false });
    } catch {
      // Skip unparseable statements (e.g. INSERT, GRANT, CREATE INDEX, DO blocks, etc.)
      continue;
    }

    for (const stmt of statements) {
      switch (stmt.type) {
        case "create table":
          handleCreateTable(schema, stmt);
          break;
        case "alter table":
          handleAlterTable(schema, stmt);
          break;
        case "drop table":
          handleDropTable(schema, stmt);
          break;
      }
    }
  }
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";
  let inDollarQuote = false;
  let dollarTag = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] ?? "";

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (inDollarQuote) {
      current += ch;
      // Check for closing dollar-quote tag
      if (ch === "$") {
        const remaining = sql.slice(i);
        if (remaining.startsWith(dollarTag)) {
          current += dollarTag.slice(1); // skip the $ we already added
          i += dollarTag.length - 1;
          inDollarQuote = false;
        }
      }
      continue;
    }

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        // Check for escaped quote ('')
        if (stringChar === "'" && next === "'") {
          current += next;
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    // Not inside any quote/comment
    if (ch === "-" && next === "-") {
      inLineComment = true;
      current += ch;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      current += ch;
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === "$") {
      // Try to match a dollar-quote tag: $tag$ or $$
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        dollarTag = match[1];
        inDollarQuote = true;
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed + ";");
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

function handleCreateTable(schema: Schema, stmt: any): void {
  const tableName = stmt.name?.name;
  if (!tableName) return;

  const table = createTable(tableName);

  // Process columns
  if (stmt.columns) {
    for (const col of stmt.columns) {
      if (col.kind === "column") {
        const column = extractColumn(col);
        table.columns.push(column);

        if (column.primaryKey) {
          table.primaryKey.push(column.name);
        }

        // Check for inline foreign key reference
        const fk = extractInlineForeignKey(col, column.name);
        if (fk) {
          table.foreignKeys.push(fk);
        }
      }
    }
  }

  // Process table-level constraints
  if (stmt.constraints) {
    processConstraints(table, stmt.constraints);
  }

  schema.tables.set(tableName, table);
}

function handleAlterTable(schema: Schema, stmt: any): void {
  const tableName = stmt.table?.name;
  if (!tableName) return;

  const table = schema.tables.get(tableName);
  if (!table) return;

  if (!stmt.changes) return;

  for (const change of stmt.changes) {
    switch (change.type) {
      case "add column": {
        const col = change.column;
        if (col?.kind === "column") {
          const column = extractColumn(col);
          table.columns.push(column);

          if (column.primaryKey) {
            table.primaryKey.push(column.name);
          }

          const fk = extractInlineForeignKey(col, column.name);
          if (fk) {
            table.foreignKeys.push(fk);
          }
        }
        break;
      }
      case "add constraint": {
        if (change.constraint) {
          processConstraints(table, [change.constraint]);
        }
        break;
      }
    }
  }
}

function handleDropTable(schema: Schema, stmt: any): void {
  if (stmt.names) {
    for (const name of stmt.names) {
      schema.tables.delete(name.name);
    }
  }
}

function extractColumn(col: any): Column {
  const name: string = col.name?.name ?? "";
  const type = formatDataType(col.dataType);
  let nullable = true;
  let primaryKey = false;
  let unique = false;
  let defaultValue: string | undefined;

  if (col.constraints) {
    for (const constraint of col.constraints) {
      switch (constraint.type) {
        case "not null":
          nullable = false;
          break;
        case "primary key":
          primaryKey = true;
          nullable = false;
          break;
        case "unique":
          unique = true;
          break;
        case "default":
          defaultValue = formatDefault(constraint.default);
          break;
      }
    }
  }

  return { name, type, nullable, primaryKey, unique, defaultValue };
}

function extractInlineForeignKey(col: any, columnName: string): ForeignKey | null {
  if (!col.constraints) return null;

  for (const constraint of col.constraints) {
    if (constraint.type === "reference" && constraint.foreignTable) {
      return {
        columns: [columnName],
        referencedTable: constraint.foreignTable.name,
        referencedColumns: constraint.foreignColumns?.map((c: any) => c.name) ?? [],
      };
    }
  }

  return null;
}

function processConstraints(table: Table, constraints: any[]): void {
  for (const constraint of constraints) {
    switch (constraint.type) {
      case "primary key": {
        const cols = constraint.columns?.map((c: any) => c.name) ?? [];
        table.primaryKey.push(...cols);
        // Mark columns as PK
        for (const colName of cols) {
          const col = table.columns.find((c) => c.name === colName);
          if (col) {
            col.primaryKey = true;
            col.nullable = false;
          }
        }
        break;
      }
      case "foreign key": {
        table.foreignKeys.push({
          columns: constraint.localColumns?.map((c: any) => c.name) ?? [],
          referencedTable: constraint.foreignTable?.name ?? "",
          referencedColumns: constraint.foreignColumns?.map((c: any) => c.name) ?? [],
        });
        break;
      }
      case "unique": {
        const cols = constraint.columns?.map((c: any) => c.name) ?? [];
        table.uniqueConstraints.push(cols);
        if (cols.length === 1) {
          const col = table.columns.find((c) => c.name === cols[0]);
          if (col) col.unique = true;
        }
        break;
      }
    }
  }
}

function formatDataType(dataType: any): string {
  if (!dataType) return "unknown";
  let name: string = dataType.name ?? "unknown";

  // Normalize common PostgreSQL types
  const typeMap: Record<string, string> = {
    "character varying": "varchar",
    "double precision": "float8",
    "timestamp without time zone": "timestamp",
    "timestamp with time zone": "timestamptz",
    "time without time zone": "time",
    "time with time zone": "timetz",
  };

  name = typeMap[name] ?? name;

  if (dataType.config && dataType.config.length > 0) {
    name += `(${dataType.config.join(",")})`;
  }

  return name;
}

function formatDefault(def: any): string | undefined {
  if (!def) return undefined;
  if (def.type === "string") return `'${def.value}'`;
  if (def.type === "numeric") return String(def.value);
  if (def.type === "boolean") return String(def.value);
  if (def.type === "null") return "NULL";
  return undefined;
}
