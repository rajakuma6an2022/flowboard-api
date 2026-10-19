# Flowboard API

REST API for [Flowboard](https://github.com/rajakuma6an2022/flowboard), an accessible Kanban
board. Built with Node.js, Express 5, MongoDB (Mongoose) and TypeScript.

> **Status:** work in progress (Day 2 of 10). The full README arrives at the end.

## What makes it interesting

- **Concurrency-safe moves:** a move writes ONE document. Cards use fractional positions plus a
  `version` compare-and-set, so simultaneous edits return `409` instead of overwriting each
  other ([ADR-002](docs/decisions/002-single-document-moves-with-fractional-positions.md)).
- **Validation at the boundary:** Zod validates every request. Errors are always
  `{ code, message }` ([ADR-003](docs/decisions/003-zod-contract-validated-at-the-boundary.md)).
- **Real integration tests:** Supertest against a real MongoDB, including a concurrency test and
  a column-rebalance test.

## Endpoints

| Method | Path                  | What it does                                           |
| ------ | --------------------- | ------------------------------------------------------ |
| GET    | `/api/health`         | Process and database status (pings MongoDB)            |
| GET    | `/api/board`          | List cards. Optional `?q=` text search and `?label=`   |
| POST   | `/api/cards`          | Create a card                                          |
| PATCH  | `/api/cards/:id`      | Update a card. Body must include the current `version` |
| POST   | `/api/cards/:id/move` | Move a card: `{ toColumnId, toIndex, version }`        |
| DELETE | `/api/cards/:id`      | Delete a card                                          |

Status codes: `400` validation, `404` not found, `409` stale version, `413` body too large.

## Run it locally

Requires Node 22.18 or newer and a MongoDB database (Atlas free tier, or a local one).

```bash
npm install
cp .env.example .env   # then put your MONGODB_URI in it
npm run seed           # loads the demo board
npm run dev            # http://localhost:4000
```

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start with auto-reload               |
| `npm run seed`      | Reset the database to the demo board |
| `npm test`          | Run all tests                        |
| `npm run lint`      | Lint with oxlint                     |
| `npm run typecheck` | Type-check                           |
| `npm run build`     | Bundle to `dist/index.js`            |
| `npm start`         | Run the production bundle            |

### Tests

Tests that need a database use a real MongoDB. Locally, `mongodb-memory-server` downloads and
starts one (the first run is slow). In CI a `mongo:7` service container is used through
`TEST_MONGODB_URI`. Each test file gets its own throwaway database.

## Architecture decisions

See [`docs/decisions`](docs/decisions).
