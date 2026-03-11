# flyway2mermaid

[![CI](https://github.com/navikt/flyway2mermaid/actions/workflows/ci.yml/badge.svg)](https://github.com/navikt/flyway2mermaid/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that generates [Mermaid ER diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html) from [Flyway](https://flywaydb.org/) SQL migration files and commits them to your repo.

## Quick start

Add this workflow to your repository:

```yaml
name: Update ER diagram

on:
  push:
    branches: [main]
    paths:
      - "src/main/resources/db/migration/**"

permissions:
  contents: write

jobs:
  diagram:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: navikt/flyway2mermaid@v1
        with:
          migrations: src/main/resources/db/migration
```

That's it! When migrations change, the action generates a Mermaid ER diagram and commits it to `docs/schema.mmd`.

To display the diagram in your README:

````markdown
```mermaid
erDiagram
```

<!-- Or simply link to it: -->

[View ER diagram](docs/schema.mmd)
````

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

The action generates:

```mermaid
erDiagram
    departments ||--o{ users : "department_id"

    departments {
        serial id PK
        varchar_100 name "NOT NULL"
    }

    users {
        serial id PK
        varchar_50 username UK "NOT NULL"
        integer department_id FK
    }
```

## Inputs

| Input            | Default                             | Description                        |
| ---------------- | ----------------------------------- | ---------------------------------- |
| `migrations`     | _(required)_                        | Path to Flyway migration directory |
| `output`         | `docs/schema.mmd`                   | Output file path                   |
| `commit`         | `true`                              | Commit and push the diagram        |
| `commit-message` | `docs: update ER diagram [skip ci]` | Commit message                     |

## Outputs

| Output    | Description                       |
| --------- | --------------------------------- |
| `diagram` | Path to the generated file        |
| `changed` | `true` if the diagram was updated |

## Advanced: generate without committing

```yaml
- uses: navikt/flyway2mermaid@v1
  id: erd
  with:
    migrations: src/main/resources/db/migration
    commit: "false"

- name: Upload as artifact
  if: steps.erd.outputs.changed == 'true'
  uses: actions/upload-artifact@v4
  with:
    name: er-diagram
    path: ${{ steps.erd.outputs.diagram }}
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

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
