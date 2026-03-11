# flyway2mermaid

Generate [Mermaid ER diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html) from [Flyway](https://flywaydb.org/) SQL migration files.

## Features

- Parses Flyway versioned migration files (`V1__create_users.sql`, etc.)
- Supports PostgreSQL DDL (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`)
- Detects primary keys, foreign keys, unique constraints
- Generates Mermaid `erDiagram` syntax with correct cardinality
- Pipe-friendly stdout output, ideal for CI/CD pipelines

## Installation

```bash
npm install -g flyway2mermaid
```

Or use directly with `npx`:

```bash
npx flyway2mermaid ./migrations
```

## Usage

```bash
# Output to stdout
flyway2mermaid ./src/main/resources/db/migration

# Write to file
flyway2mermaid ./migrations -o docs/schema.mmd

# Pipe to a file
flyway2mermaid ./migrations > schema.mmd
```

## Example

Given these migration files:

**V1\_\_create_departments.sql**

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
```

**V2\_\_create_users.sql**

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id)
);
```

Running `flyway2mermaid ./migrations` produces:

```mermaid
erDiagram
    departments ||--o{ users : "department_id"

    departments {
        serial id PK
        varchar_100 name "NOT NULL"
    }

    users {
        serial id PK
        varchar_50 username UK,"NOT NULL"
        integer department_id FK
    }
```

## Supported SQL

| Statement                       | Support                               |
| ------------------------------- | ------------------------------------- |
| `CREATE TABLE`                  | ✅ Columns, types, inline constraints |
| `ALTER TABLE ADD COLUMN`        | ✅                                    |
| `ALTER TABLE ADD CONSTRAINT`    | ✅ PK, FK, UNIQUE                     |
| `DROP TABLE`                    | ✅                                    |
| `PRIMARY KEY`                   | ✅ Inline and table-level             |
| `FOREIGN KEY` / `REFERENCES`    | ✅ Inline and table-level             |
| `NOT NULL`, `UNIQUE`, `DEFAULT` | ✅                                    |

## CI/CD Usage

Add to your pipeline to auto-generate schema documentation:

```yaml
# GitHub Actions example
- name: Generate ER diagram
  run: npx flyway2mermaid ./migrations -o docs/schema.mmd
```

## Programmatic API

```typescript
import { readFlywayMigrations, buildSchema, generateMermaid } from "flyway2mermaid";

const migrations = await readFlywayMigrations("./migrations");
const schema = buildSchema(migrations.map((m) => m.sql));
const diagram = generateMermaid(schema);
console.log(diagram);
```

## License

MIT
