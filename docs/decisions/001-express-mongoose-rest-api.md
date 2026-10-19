# ADR-001: Express + Mongoose REST API in its own repository

- Status: Accepted
- Date: 2026-10-20

## Context

The Flowboard web app started with a mocked API. I want it to talk to a real backend so the
project also shows API design, data modelling, concurrency handling and deployment, using the
MERN stack. The web app and the API will be deployed to different hosts (Vercel and Render).

## Decision

- A separate repository, `flowboard-api`, with its own CI, releases and deployment.
- Express 5 (promise rejections reach the error middleware without extra code), Mongoose 9 for
  modelling, Zod for validating everything that enters the API, TypeScript throughout.
- Layers: routes (HTTP), middleware (cross-cutting), models (persistence), lib (pure logic and
  ordering), contract (data shapes). Business rules live in `lib`, not in route handlers.
- The production build is a single bundled JavaScript file made with tsup.

## Alternatives considered

- **One monorepo with the web app**: easier to share types, but I chose two repositories so each
  deploys independently and the API can be reviewed and versioned on its own. The cost is that
  the data contract must be kept in sync by hand (see ADR-003).
- **Next.js route handlers**: fewer moving parts, but it is not the MERN stack and Next.js is
  covered by a different project.
- **Fastify or NestJS**: both good; Express is the most common in job descriptions and keeps the
  layering visible rather than hidden behind decorators.

## Consequences

- Easier: independent deploys, a focused README and CI, and a clean story for interviewers.
- Harder: two repositories to keep in sync and two sets of pull requests.
