# ADR-002: Moving a card writes ONE document (fractional positions + version check)

- Status: Accepted
- Date: 2026-10-20

## Context

Dragging a card changes its order. The obvious design stores an integer index per card, so
inserting at index 2 means renumbering every card after it: many writes, and they must be atomic
or two users can corrupt the order. MongoDB multi-document transactions need a replica set, are
unavailable on a plain local `mongod`, and are slower. I also need to detect two people editing
the same card (HTTP 409).

## Decision

1. `position` is a floating point sort key, not an index. A card moved between two neighbours
   gets the midpoint of their positions, so **only the moved card is written**.
2. Positions start 1024 apart. If two neighbours get closer than 1e-6, the column is
   rebalanced (positions rewritten as 1024, 2048, ...). That is rare, and it does not change any
   card's `version`, so clients holding a version are not affected.
3. Every write is a compare-and-set: `findOneAndUpdate({ _id, version }, { $inc: { version: 1 } })`.
   If it matches nothing, the card is either gone (404) or someone changed it first (409).
4. Ties are broken by `_id`, so ordering is always deterministic.

## Alternatives considered

- **Integer index + renumber**: simple to reason about but O(n) writes per move and needs a
  transaction for correctness.
- **Linked list (`prevId`/`nextId`)**: O(1) writes but reading in order needs traversal, and a
  broken link corrupts the column.
- **Lexicographic ranks (LexoRank / fractional-indexing strings)**: no float precision limit,
  but harder to read and debug. Floats plus an occasional rebalance are enough at this scale.
- **Transactions on a replica set**: correct, but heavier and not available in every local setup.

## Consequences

- Easier: a move is one atomic write; conflicts are detected cheaply; tests can run on a plain
  `mongod`.
- Harder: positions are meaningless numbers (never show them), and the rebalance path needs its
  own test (it has one: 45 inserts at the same spot). A rebalance running at the same moment as
  a move is not fully atomic; the worst case is a briefly odd order that the next move or
  refetch corrects. That limitation is accepted and documented.
