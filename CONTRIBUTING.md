# Contributing to flyway2mermaid

We welcome contributions! Here's how to get started.

## Development setup

```bash
git clone https://github.com/navikt/flyway2mermaid.git
cd flyway2mermaid
npm install
```

## Available scripts

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `npm run build`      | Compile TypeScript to `dist/`     |
| `npm test`           | Run tests with Vitest             |
| `npm run test:watch` | Run tests in watch mode           |
| `npm run lint`       | ESLint + TypeScript type checking |
| `npm run format`     | Format code with Prettier         |

## Making changes

1. Fork the repository and create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure linting passes: `npm run lint`
5. Commit your changes – the pre-commit hook will run ESLint and Prettier automatically
6. Open a pull request

## Adding support for new SQL statements

The SQL parser is in `src/parser/sql.ts`. To support a new DDL statement:

1. Add a test case in `test/sql-parser.test.ts`
2. Add handling in the `applyMigration` switch statement
3. Update the snapshot: `npx vitest run --update`

## Reporting issues

Please use [GitHub Issues](https://github.com/navikt/flyway2mermaid/issues) to report bugs or request features.
