import { COLUMN_IDS, type ColumnId, type Label } from '../contract/schemas'
import { GAP } from '../lib/positions'
import type { CardDoc } from '../models/Card'

type Row = [
  title: string,
  label: Label,
  description: string,
  dueDate: string | null,
  assignee: string | null,
]

const ROWS: Record<ColumnId, Row[]> = {
  backlog: [
    [
      'Add card comments',
      'feature',
      'Let people discuss a card without leaving the board.',
      '2026-11-20',
      'AK',
    ],
    ['Export board as CSV', 'feature', 'Download all cards with column and label.', null, null],
    [
      'Keyboard shortcut cheat sheet',
      'design',
      'A dialog listing every shortcut, opened with ?.',
      '2026-11-25',
      'MR',
    ],
    [
      'Investigate slow search on large boards',
      'bug',
      'Typing lags once there are 500+ cards.',
      null,
      'JT',
    ],
    [
      'Archive old Done cards',
      'chore',
      'Move cards older than 30 days out of the board.',
      null,
      null,
    ],
    ['Card templates', 'feature', 'Create cards from a saved template.', '2026-12-05', 'AK'],
    ['Improve empty column illustration', 'design', 'Replace the placeholder icon.', null, 'SN'],
    [
      'Document the fault panel',
      'chore',
      'Explain each control in the README.',
      '2026-11-18',
      null,
    ],
    [
      'Label colors for color-blind users',
      'design',
      'Add icons so color is never the only signal.',
      '2026-11-22',
      'MR',
    ],
    ['Bulk move cards', 'feature', 'Select several cards and move them together.', null, 'JT'],
  ],
  'in-progress': [
    [
      'Keyboard drag and drop',
      'feature',
      'Pick up, move and drop cards with the keyboard.',
      '2026-10-28',
      'AK',
    ],
    [
      'Optimistic move with rollback',
      'feature',
      'Move instantly, restore on failure.',
      '2026-10-29',
      'AK',
    ],
    [
      'Fix focus ring on card drag handle',
      'bug',
      'Focus outline is clipped by the column.',
      '2026-10-27',
      'SN',
    ],
    [
      'Debounced search',
      'feature',
      'Wait 300ms after typing before requesting.',
      '2026-10-26',
      'JT',
    ],
    [
      'Skeleton loading state',
      'design',
      'Match final card height to avoid layout shift.',
      '2026-10-27',
      'MR',
    ],
    ['Set up Sentry', 'chore', 'Capture unhandled errors in production.', '2026-11-02', null],
    ['Retry with backoff', 'feature', 'Retry only network and 5xx failures.', '2026-10-30', 'JT'],
    [
      'Write ADR for state management',
      'chore',
      'Explain TanStack Query versus Zustand.',
      '2026-10-31',
      'AK',
    ],
  ],
  review: [
    [
      'URL-synced filters',
      'feature',
      'Search and label live in the query string.',
      '2026-10-25',
      'JT',
    ],
    [
      'Card detail route',
      'feature',
      'Open /cards/:id as a dialog over the board.',
      '2026-10-25',
      'SN',
    ],
    [
      'Error state with Retry',
      'design',
      'Calm message and a primary Retry button.',
      '2026-10-24',
      'MR',
    ],
    [
      'Partial data banner',
      'feature',
      'Tell users when some cards were skipped.',
      '2026-10-24',
      'AK',
    ],
    ['Fix 409 toast wording', 'bug', 'Say the card changed elsewhere.', '2026-10-23', null],
    ['Add label filter', 'feature', 'Filter the board by label.', '2026-10-23', 'JT'],
    ['Clean up Tailwind tokens', 'chore', 'Remove unused theme variables.', null, 'SN'],
  ],
  done: [
    ['Project scaffold', 'chore', 'Vite, React, TypeScript, Tailwind.', '2026-10-19', 'AK'],
    [
      'Design tokens in Figma',
      'design',
      'Color, radius, spacing and type variables.',
      '2026-10-19',
      'MR',
    ],
    ['Storybook with a11y addon', 'chore', 'All primitives have stories.', '2026-10-19', 'AK'],
    [
      'Button and Input primitives',
      'design',
      'All states including error and disabled.',
      '2026-10-19',
      'SN',
    ],
    ['Native dialog component', 'feature', 'Focus trap and Escape for free.', '2026-10-19', 'AK'],
    ['CI pipeline', 'chore', 'Lint, typecheck, build on every PR.', '2026-10-19', 'JT'],
    ['Deploy to Vercel', 'chore', 'SPA rewrite for deep links.', '2026-10-19', 'JT'],
    ['Zod schemas', 'feature', 'Types are inferred from schemas.', '2026-10-20', 'AK'],
    [
      'Express and MongoDB API',
      'feature',
      'Real backend with optimistic concurrency.',
      '2026-10-21',
      'AK',
    ],
    ['Typed API client', 'feature', 'One error type for the whole UI.', '2026-10-22', 'MR'],
    ['Query client defaults', 'chore', 'Retry rules and backoff.', '2026-10-22', 'SN'],
  ],
}

export function buildSeedCards(): CardDoc[] {
  return COLUMN_IDS.flatMap((columnId) =>
    ROWS[columnId].map(([title, label, description, dueDate, assignee], i) => ({
      title,
      label,
      description,
      dueDate,
      assignee,
      columnId,
      position: (i + 1) * GAP,
      version: 1,
    })),
  )
}
