import type { SourceTable } from '../api/types'
import { StatusPill, type PillTone } from './StatusPill'

interface Trust {
  label: string
  tone: PillTone
  explain: string
}

/** The source table a citation came from is the answer's trust level. */
const TRUST: Record<SourceTable, Trust> = {
  published_data_points: {
    label: 'SCAI approved · published',
    tone: 'ok',
    explain:
      'Drawn from the published data points table. These figures have been through approval and are cleared for publication.',
  },
  indicator_values: {
    label: 'Working data · not yet published',
    tone: 'warn',
    explain:
      'Drawn from the working indicator values table. These figures are loaded but have not been approved for publication, so they can still change.',
  },
  indicator_analysis: {
    label: 'Analyst commentary',
    tone: 'info',
    explain:
      'Drawn from the analyst commentary table. This is written interpretation rather than a measured data point.',
  },
}

export function trustFor(table: SourceTable | null | undefined): Trust {
  if (table && table in TRUST) return TRUST[table]
  return {
    label: 'Unknown source table',
    tone: 'neutral',
    explain: 'The citation names a table this panel does not have a trust label for.',
  }
}

export function TrustPill({ table }: { table: SourceTable | null | undefined }) {
  const trust = trustFor(table)
  return (
    <StatusPill tone={trust.tone} title={trust.explain}>
      {trust.label}
    </StatusPill>
  )
}
