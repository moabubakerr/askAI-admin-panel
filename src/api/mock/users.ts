import type { Account, ActivityRow } from '../types'
import { guid } from './ids'

/**
 * The seeds carry fixed dates so the spread between them is deliberate, but
 * they are shifted on load so the newest sits a few minutes in the past.
 * Otherwise fixed fixture dates drift into the future and the console reports
 * things happening "in 13 minutes".
 */
const NEWEST_SEED = Date.parse('2026-09-22T09:18:02Z')
const SHIFT = Date.now() - 3 * 60_000 - NEWEST_SEED

function shifted(iso: string): string {
  return new Date(Date.parse(iso) + SHIFT).toISOString()
}

/** Invented accounts. Not in the API spec — this screen is local only. */
const ACCOUNT_SEEDS: Account[] = [
  {
    account_id: guid('account-1'),
    username: 'n.alkuwari',
    email: 'n.alkuwari@example.gov.qa',
    role: 'Administrator',
    via: 'sso',
    last_seen_at: '2026-09-22T08:54:11Z',
    status: 'active',
  },
  {
    account_id: guid('account-2'),
    username: 'r.haddad',
    email: 'r.haddad@example.gov.qa',
    role: 'Analyst',
    via: 'sso',
    last_seen_at: '2026-09-22T07:31:02Z',
    status: 'active',
  },
  {
    account_id: guid('account-3'),
    username: 'm.otaibi',
    email: 'm.otaibi@example.gov.qa',
    role: 'Analyst',
    via: 'password',
    last_seen_at: '2026-09-19T14:08:47Z',
    status: 'idle',
  },
  {
    account_id: guid('account-4'),
    username: 's.mansouri',
    email: 's.mansouri@example.gov.qa',
    role: 'Viewer',
    via: 'sso',
    last_seen_at: '2026-09-21T11:22:30Z',
    status: 'active',
  },
  {
    account_id: guid('account-5'),
    username: 'etl-reporting',
    email: 'etl-reporting@example.gov.qa',
    role: 'Viewer',
    via: 'api key',
    last_seen_at: '2026-09-01T02:18:44Z',
    status: 'active',
  },
  {
    account_id: guid('account-6'),
    username: 'a.balushi',
    email: 'a.balushi@example.gov.qa',
    role: 'Analyst',
    via: 'password',
    last_seen_at: '2026-07-04T09:12:05Z',
    status: 'suspended',
  },
  {
    account_id: guid('account-7'),
    username: 'k.thani',
    email: 'k.thani@example.gov.qa',
    role: 'Administrator',
    via: 'sso',
    last_seen_at: '2026-09-20T16:40:19Z',
    status: 'active',
  },
]

export const ACCOUNTS: Account[] = ACCOUNT_SEEDS.map((account) => ({
  ...account,
  last_seen_at: account.last_seen_at ? shifted(account.last_seen_at) : null,
}))

const ACTIVITY_SEEDS: ActivityRow[] = [
  {
    activity_id: guid('activity-1'),
    at: '2026-09-22T09:18:02Z',
    who: 'n.alkuwari',
    what: 'Read provenance for a performance ranking answer',
  },
  {
    activity_id: guid('activity-2'),
    at: '2026-09-22T09:02:44Z',
    who: 'r.haddad',
    what: 'Filtered conversations to unverified answers',
  },
  {
    activity_id: guid('activity-3'),
    at: '2026-09-21T16:47:10Z',
    who: 'r.haddad',
    what: 'Exported the stale indicator list',
  },
  {
    activity_id: guid('activity-4'),
    at: '2026-09-21T13:20:55Z',
    who: 'k.thani',
    what: 'Read provenance for an Arabic growth rate answer',
  },
  {
    activity_id: guid('activity-5'),
    at: '2026-09-20T10:05:31Z',
    who: 'n.alkuwari',
    what: 'Suspended the account a.balushi',
  },
  {
    activity_id: guid('activity-6'),
    at: '2026-09-18T11:31:08Z',
    who: 's.mansouri',
    what: 'Filtered conversations to feedback with comments',
  },
  {
    activity_id: guid('activity-7'),
    at: '2026-09-01T02:18:44Z',
    who: 'etl-reporting',
    what: 'ETL load recorded across 7 tables from 10 export files',
  },
]

export const ACTIVITY: ActivityRow[] = ACTIVITY_SEEDS.map((row) => ({
  ...row,
  at: shifted(row.at),
}))
