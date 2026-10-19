# ADR-003: A Zod contract file, validated at every boundary, copied (not shared) across repos

- Status: Accepted
- Date: 2026-10-20

## Context

TypeScript types vanish at runtime. The API must not trust request bodies, and the web app must
not trust responses. The two sides must also agree on what a "card" is. Because the API and the
web app live in separate repositories, they cannot import the same package without publishing one.

## Decision

- The API owns the contract: `src/contract/schemas.ts`, which imports only `zod`. Every
  TypeScript type is inferred from it with `z.infer`.
- The API validates everything that comes in (request bodies and query strings, including
  rejecting operator-style input such as `q[$ne]=x`) and returns errors as `{ code, message }`.
- The web repository keeps an identical copy. Its CI downloads the file from this repository's
  `main` branch and fails if the two differ (a contract drift check). To change the contract:
  edit it here, release the API, then copy it to the web repository.
- The web app validates everything that comes back from the network, item by item for lists
  (`parseBoard`), so one bad card becomes a "skipped" count, not a crash.

## Alternatives considered

- **A shared npm package**: the cleanest option, but it needs publishing (npm or GitHub
  Packages), versioning and a release step for every field change. Too heavy for one developer.
- **OpenAPI plus generated clients**: the right tool for large teams or public APIs; too much
  tooling here.
- **Hand-written types on each side**: no runtime protection and silent drift.
- **A git submodule**: shares the file without publishing, but submodules are easy to get wrong.

## Consequences

- Easier: simple tooling, one file to read, and a failing CI check instead of silent drift.
- Harder: changing the contract is a two-repository change, and the drift check depends on
  this repository being public (or on a token). That trade-off is accepted.
