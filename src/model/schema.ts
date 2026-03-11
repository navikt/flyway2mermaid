export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
}

export interface ForeignKey {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface Table {
  name: string;
  columns: Column[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  uniqueConstraints: string[][];
}

export interface Schema {
  tables: Map<string, Table>;
}

export function createSchema(): Schema {
  return { tables: new Map() };
}

export function createTable(name: string): Table {
  return {
    name,
    columns: [],
    primaryKey: [],
    foreignKeys: [],
    uniqueConstraints: [],
  };
}
