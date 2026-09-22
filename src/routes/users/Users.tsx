import { useMemo, useState, type FormEvent } from 'react'
import { ACCOUNTS, ACTIVITY } from '../../api/mock'
import { useApp } from '../../app/AppContext'
import type { Account, AccountStatus, ActivityRow, UserRole } from '../../api/types'
import { COPY } from '../../copy'
import { Button, Select, TextInput } from '../../components/controls'
import { DataTable, KeyboardHint, type Column } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { Panel } from '../../components/KpiCard'
import { Mono, StatusPill, type PillTone } from '../../components/StatusPill'
import { formatAbsolute, formatRelative } from '../../lib/format'

const STATUS_TONE: Record<AccountStatus, PillTone> = {
  active: 'ok',
  idle: 'neutral',
  suspended: 'bad',
}

const ROLES: UserRole[] = ['Administrator', 'Analyst', 'Viewer']

/**
 * Not in the API spec. This screen works against a local interface so it can be
 * wired to a real endpoint later without changing the table.
 */
interface AccountStore {
  accounts: Account[]
  setStatus: (accountId: string, status: AccountStatus) => void
  add: (username: string, role: UserRole) => void
}

function useAccountStore(): AccountStore {
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS)

  return {
    accounts,
    setStatus: (accountId, status) =>
      setAccounts((prev) =>
        prev.map((account) =>
          account.account_id === accountId ? { ...account, status } : account,
        ),
      ),
    add: (username, role) =>
      setAccounts((prev) => [
        {
          account_id: `local-${username}`,
          username,
          email: `${username}@example.gov.qa`,
          role,
          via: 'sso',
          last_seen_at: null,
          status: 'active',
        },
        ...prev,
      ]),
  }
}

export default function Users() {
  const { mock } = useApp()
  const store = useAccountStore()
  const [adding, setAdding] = useState(false)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<UserRole>('Viewer')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!username.trim()) return
    store.add(username.trim(), role)
    setUsername('')
    setRole('Viewer')
    setAdding(false)
  }

  const columns: Column<Account>[] = useMemo(
    () => [
      {
        key: 'account',
        header: 'Account',
        render: (account) => (
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-maroon-tint text-[10px] font-semibold text-maroon">
              {initialsOf(account.username)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium text-ink-1">
                {account.username}
              </span>
              <span className="block truncate text-[11px] text-ink-4">
                {account.email}
              </span>
            </span>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        width: 'w-[136px]',
        render: (account) => <span className="text-ink-2">{account.role}</span>,
      },
      {
        key: 'via',
        header: 'Signs in via',
        width: 'w-[112px]',
        render: (account) => (
          <StatusPill mono tone="neutral">
            {account.via}
          </StatusPill>
        ),
      },
      {
        key: 'last_seen',
        header: 'Last seen',
        width: 'w-[128px]',
        render: (account) =>
          account.last_seen_at ? (
            <span title={formatAbsolute(account.last_seen_at)} className="text-ink-2">
              {formatRelative(account.last_seen_at)}
            </span>
          ) : (
            <span className="text-ink-4">Never signed in</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-[104px]',
        render: (account) => (
          <StatusPill tone={STATUS_TONE[account.status]}>{account.status}</StatusPill>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        width: 'w-[112px]',
        render: (account) => (
          <Button
            onClick={() =>
              store.setStatus(
                account.account_id,
                account.status === 'suspended' ? 'active' : 'suspended',
              )
            }
          >
            {account.status === 'suspended' ? 'Reinstate' : 'Suspend'}
          </Button>
        ),
      },
    ],
    [store],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-gold-border bg-gold-tint px-4 py-2.5">
        <p className="text-[11.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-gold-ink">Sessions are not durable.</span>{' '}
          {COPY.tokensInMemory}
        </p>
      </div>

      <Panel
        title="Panel accounts"
        subtitle="Roles map to the read scopes the API already enforces. This panel makes no changes to the assistant's data."
        actions={
          <>
            <KeyboardHint opens={false} />
            <Button variant="primary" onClick={() => setAdding((v) => !v)}>
              {adding ? 'Cancel' : 'Add account'}
            </Button>
          </>
        }
      >
        {adding && (
          <form
            onSubmit={submit}
            className="flex flex-wrap items-end gap-3 border-b border-line bg-sunken px-4 py-3"
          >
            <TextInput
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoFocus
              required
              className="w-[220px]"
            />
            <Select
              label="Role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-[168px]"
            >
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="primary">
              Add
            </Button>
            <p className="w-full text-[11px] leading-relaxed text-ink-3">
              {mock
                ? COPY.mockModeNoRequest
                : 'There is no create endpoint yet, so this adds the row in this browser only.'}
            </p>
          </form>
        )}

        <DataTable
          caption="Panel accounts"
          rows={store.accounts}
          columns={columns}
          getRowKey={(account) => account.account_id}
          empty={
            <EmptyState
              title="No accounts"
              body="No panel accounts are configured for this deployment."
            />
          }
        />
      </Panel>

      <Panel title="Recent admin activity" subtitle="What was read, and by whom.">
        <ActivityList rows={ACTIVITY} />
      </Panel>
    </div>
  )
}

function ActivityList({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No recorded activity"
        body="Nothing has been read through the panel yet."
      />
    )
  }
  return (
    <ul className="divide-y divide-rowline">
      {rows.map((row) => (
        <li key={row.activity_id} className="flex items-baseline gap-3 px-4 py-2 text-[12px]">
          <span
            className="w-[104px] shrink-0 text-ink-4"
            title={formatAbsolute(row.at)}
          >
            {formatRelative(row.at)}
          </span>
          <Mono className="w-[104px] shrink-0 text-ink-2">{row.who}</Mono>
          <span className="min-w-0 flex-1 text-ink-2">{row.what}</span>
        </li>
      ))}
    </ul>
  )
}

function initialsOf(username: string): string {
  const parts = username.split(/[.\-_]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

