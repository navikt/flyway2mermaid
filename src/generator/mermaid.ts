import type { Schema, Table, Column, ForeignKey } from "../model/schema.js";

export function generateMermaid(schema: Schema): string {
  const lines: string[] = ["erDiagram"];

  const tables = sortByImportance(Array.from(schema.tables.values()));

  // Collect all relationships
  const relationships = collectRelationships(tables);
  if (relationships.length > 0) {
    for (const rel of relationships) {
      lines.push(`    ${rel}`);
    }
    lines.push("");
  }

  // Render table definitions
  for (const table of tables) {
    lines.push(`    ${table.name} {`);
    for (const col of table.columns) {
      const parts = [formatType(col.type), col.name];
      const { keys, comment } = getAnnotations(col, table);
      if (keys) {
        parts.push(keys);
      }
      if (comment) {
        parts.push(`"${comment}"`);
      }
      lines.push(`        ${parts.join(" ")}`);
    }
    lines.push("    }");
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function collectRelationships(tables: Table[]): string[] {
  const relationships: string[] = [];
  const fkColumnsMap = new Map<string, Set<string>>();

  // Build a set of FK columns per table for quick lookup
  for (const table of tables) {
    const fkCols = new Set<string>();
    for (const fk of table.foreignKeys) {
      for (const col of fk.columns) {
        fkCols.add(col);
      }
    }
    fkColumnsMap.set(table.name, fkCols);
  }

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const cardinality = determineCardinality(table, fk);
      const label = fk.columns.join(", ");
      relationships.push(`${fk.referencedTable} ${cardinality} ${table.name} : "${label}"`);
    }
  }

  return relationships;
}

function determineCardinality(table: Table, fk: ForeignKey): string {
  // Check if the FK columns form a unique constraint or are the primary key
  const fkColSet = new Set(fk.columns);

  // Only one-to-one if FK columns cover the entire PK (not just part of composite PK)
  const isPk =
    fk.columns.length > 0 &&
    fk.columns.length === table.primaryKey.length &&
    fk.columns.every((c) => table.primaryKey.includes(c));

  // Check if FK columns have a unique constraint
  const isUnique =
    (fk.columns.length === 1 && table.columns.find((c) => c.name === fk.columns[0])?.unique) ||
    table.uniqueConstraints.some(
      (uc) => uc.length === fk.columns.length && uc.every((c) => fkColSet.has(c)),
    );

  // Check nullable
  const isNullable = fk.columns.some((colName) => {
    const col = table.columns.find((c) => c.name === colName);
    return col?.nullable ?? true;
  });

  if (isUnique || isPk) {
    // One-to-one
    return isNullable ? "||--o|" : "||--||";
  }

  // One-to-many (parent has one, child has many)
  return isNullable ? "||--o{" : "||--|{";
}

function formatType(type: string): string {
  // Mermaid doesn't like special characters in types, simplify
  return type.replace(/[(),]/g, "_").replace(/_+$/, "");
}

/**
 * Sort tables so that the most central/referenced tables come first,
 * followed by their dependents. This produces a more compact Mermaid layout
 * since the renderer uses declaration order as a hint for positioning.
 */
function sortByImportance(tables: Table[]): Table[] {
  // Count how many tables reference each table via FKs
  const refCount = new Map<string, number>();
  for (const t of tables) {
    refCount.set(t.name, 0);
  }
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      if (refCount.has(fk.referencedTable)) {
        refCount.set(fk.referencedTable, refCount.get(fk.referencedTable)! + 1);
      }
    }
  }

  // Build dependency graph: table -> set of tables it depends on (FK targets)
  const dependencies = new Map<string, Set<string>>();
  for (const t of tables) {
    dependencies.set(
      t.name,
      new Set(t.foreignKeys.map((fk) => fk.referencedTable).filter((ref) => ref !== t.name)),
    );
  }

  // Topological sort (Kahn's algorithm), prioritising high-refcount tables
  const sorted: Table[] = [];
  const tableMap = new Map(tables.map((t) => [t.name, t]));
  const remaining = new Map(dependencies);

  while (remaining.size > 0) {
    // Find tables whose dependencies are all already sorted
    const ready = Array.from(remaining.entries())
      .filter(([, deps]) => Array.from(deps).every((d) => !remaining.has(d)))
      .map(([name]) => name);

    if (ready.length === 0) {
      // Cycle detected – pick the most-referenced remaining table to break it
      const fallback = Array.from(remaining.keys()).sort(
        (a, b) => (refCount.get(b) ?? 0) - (refCount.get(a) ?? 0) || a.localeCompare(b),
      );
      ready.push(fallback[0]);
    }

    // Sort this batch: most referenced first, then alphabetically
    ready.sort((a, b) => (refCount.get(b) ?? 0) - (refCount.get(a) ?? 0) || a.localeCompare(b));

    for (const name of ready) {
      remaining.delete(name);
      sorted.push(tableMap.get(name)!);
    }
  }

  return sorted;
}

function getAnnotations(col: Column, table: Table): { keys: string; comment: string } {
  const keys: string[] = [];
  let comment = "";

  if (col.primaryKey || table.primaryKey.includes(col.name)) {
    keys.push("PK");
  }

  const isFk = table.foreignKeys.some((fk) => fk.columns.includes(col.name));
  if (isFk) {
    keys.push("FK");
  }

  if (col.unique) {
    keys.push("UK");
  }

  if (!col.nullable && !col.primaryKey && !table.primaryKey.includes(col.name)) {
    comment = "NOT NULL";
  }

  return { keys: keys.join(","), comment };
}
