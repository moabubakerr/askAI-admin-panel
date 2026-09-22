import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useApp, useQueryScope } from '../../app/AppContext'
import { ApiError } from '../../api/transport'
import type { Citation, MessageRow, Provenance as ProvenancePayload } from '../../api/types'
import { COPY } from '../../copy'
import { CopyDigest } from '../../components/CopyDigest'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState, LoadingState } from '../../components/ErrorState'
import { Panel } from '../../components/KpiCard'
import { RtlText } from '../../components/RtlText'
import { Eyebrow, Mono, StatusPill } from '../../components/StatusPill'
import { TrustPill } from '../../components/TrustPill'
import {
  DASH,
  formatAbsolute,
  formatCount,
  formatLatency,
  formatRelative,
  formatValue,
  orDash,
} from '../../lib/format'

export default function Provenance() {
  const { messageId = '' } = useParams()
  const { transport } = useApp()
  const scope = useQueryScope()
  const navigate = useNavigate()

  // Escape goes back, as it does in the tables.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') navigate('/conversations')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  const query = useQuery({
    queryKey: [...scope, 'provenance', messageId],
    queryFn: () => transport.provenance(messageId),
    retry: false,
  })

  const notLogged =
    query.isError && query.error instanceof ApiError && query.error.kind === 'not-found'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          to="/conversations"
          className="text-[12px] font-medium text-maroon hover:underline"
        >
          ← Back to conversations
        </Link>
        <Mono className="text-ink-4" title={messageId}>
          {messageId}
        </Mono>
      </div>

      {query.isPending ? (
        <Panel>
          <LoadingState label="the provenance chain" />
        </Panel>
      ) : notLogged ? (
        <Panel>
          <EmptyState
            title={COPY.provenanceNotFoundTitle}
            body={COPY.provenanceNotFoundBody}
          />
        </Panel>
      ) : query.isError ? (
        <ErrorState
          what="the provenance chain"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Chain data={query.data} />
      )}
    </div>
  )
}

function Chain({ data }: { data: ProvenancePayload }) {
  const { message, citations, unresolved_records: unresolved } = data

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <QuestionCard message={message} />
        <AnswerCard message={message} />
        <FeedbackCard message={message} />
      </div>

      {unresolved > 0 && (
        <div className="rounded-[10px] border border-gold-border bg-gold-tint px-4 py-3">
          <p className="text-[12.5px] font-semibold text-gold-ink">
            {formatCount(unresolved)} cited{' '}
            {unresolved === 1 ? 'record has' : 'records have'} moved since this answer
          </p>
          <p className="mt-1 max-w-4xl text-[11.5px] leading-relaxed text-ink-2">
            {COPY.unresolvedBanner(unresolved)}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-ink-1">
            Cited records
            <span className="tnum ml-2 text-[11px] font-normal text-ink-4">
              {formatCount(citations.length)}
            </span>
          </h2>
          <span className="text-[11px] text-ink-4">
            question → answer → record → numbers → indicator → source file
          </span>
        </div>

        {citations.length === 0 ? (
          <Panel className="mt-2">
            <EmptyState title={COPY.noCitationsTitle} body={COPY.noCitationsBody} />
          </Panel>
        ) : (
          <ol className="mt-2 flex flex-col gap-3">
            {citations.map((citation) => (
              <li key={`${citation.position}-${citation.record_id}`}>
                <CitationCard citation={citation} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ message }: { message: MessageRow }) {
  return (
    <Panel title="Question">
      <div className="px-4 py-3">
        <RtlText
          language={message.language}
          as="p"
          className="block text-[13px] leading-relaxed text-ink-1"
        >
          {message.question}
        </RtlText>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusPill mono tone={message.language === 'ar' ? 'info' : 'neutral'}>
            {message.language ?? DASH}
          </StatusPill>
          <StatusPill mono>{message.endpoint ?? DASH}</StatusPill>
          <StatusPill mono title={message.message_id}>
            {message.message_id.slice(0, 8)}
          </StatusPill>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-4" title={formatAbsolute(message.asked_at)}>
          Asked {formatRelative(message.asked_at)}
        </p>
      </div>
    </Panel>
  )
}

function AnswerCard({ message }: { message: MessageRow }) {
  return (
    <Panel title="Answer given">
      <div className="px-4 py-3">
        <RtlText
          language={message.language}
          as="p"
          className="block text-[13px] leading-relaxed text-ink-1"
        >
          {message.answer}
        </RtlText>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.verified === false ? (
            <StatusPill
              tone="bad"
              title="An automatic numeric check rejected the wording of this answer."
            >
              Unverified
            </StatusPill>
          ) : message.verified === true ? (
            <StatusPill tone="ok">Verified</StatusPill>
          ) : (
            <StatusPill tone="muted" title="No numeric check applies to this answer shape.">
              No check
            </StatusPill>
          )}
          {!message.answered && <StatusPill tone="warn">No answer</StatusPill>}
          <StatusPill mono>{message.answer_shape ?? DASH}</StatusPill>
          <StatusPill>{formatLatency(message.latency_ms)}</StatusPill>
        </div>
        {message.period_label && (
          <p className="mt-2 text-[10.5px] text-ink-4">Period {message.period_label}</p>
        )}
      </div>
    </Panel>
  )
}

function FeedbackCard({ message }: { message: MessageRow }) {
  const rated = message.rating !== null

  return (
    <Panel title="Feedback">
      <div className="px-4 py-3">
        {!rated ? (
          <p className="text-[12px] leading-relaxed text-ink-3">
            No rating was submitted — most messages are never rated.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className={`tnum grid size-8 place-items-center rounded-[7px] text-[15px] font-semibold ${
                  message.rating! <= 2 ? 'bg-bad-bg text-bad' : 'bg-ok-bg text-ok'
                }`}
              >
                {message.rating}
              </span>
              <span className="text-[11px] text-ink-3">out of 5</span>
            </div>
            {message.comment ? (
              <div className="mt-3 border-l-[3px] border-gold bg-gold-tint/60 px-3 py-2">
                <RtlText
                  language={message.language}
                  as="p"
                  className="block text-[12.5px] leading-relaxed text-ink-1"
                >
                  {message.comment}
                </RtlText>
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] text-ink-3">
                Rated without a comment, so there is no written detail to work from.
              </p>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}

/* ---- one card per citation, four columns ---- */

function CitationCard({ citation }: { citation: Citation }) {
  const moved = !citation.record_found
  const linkId =
    citation.published_indicator_detail_id ??
    citation.indicator_detail_id ??
    citation.indicator_id

  return (
    <section
      className={`overflow-hidden rounded-[10px] border ${
        moved ? 'border-dashed border-line-strong bg-sunken' : 'border-line bg-surface'
      }`}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-2.5">
        <span
          className={`tnum grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
            moved ? 'bg-line text-ink-3' : 'bg-maroon text-white'
          }`}
        >
          {citation.position}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold text-ink-1">
            {orDash(citation.indicator_name_en ?? citation.indicator)}
          </span>
          {citation.indicator_name_ar && (
            <RtlText as="span" className="block truncate text-[11.5px] text-ink-3">
              {citation.indicator_name_ar}
            </RtlText>
          )}
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {citation.is_main && (
            <StatusPill tone="gold" title={COPY.isMainCaveat}>
              Headline row
            </StatusPill>
          )}
          {moved ? (
            <StatusPill tone="muted" title={COPY.movedRecordBody}>
              {COPY.movedRecord}
            </StatusPill>
          ) : (
            <TrustPill table={citation.source_table} />
          )}
        </span>
      </header>

      {moved && (
        <p className="border-b border-line bg-surface px-4 py-2 text-[11px] leading-relaxed text-ink-3">
          {COPY.movedRecordBody}
        </p>
      )}

      <div className="grid grid-cols-4 divide-x divide-line">
        {/* 1. the record */}
        <Cell title="Record">
          <Row label="Source table">
            <Mono className="text-ink-2">{citation.source_table}</Mono>
          </Row>
          <Row label="Record id">
            <Mono className={moved ? 'text-ink-4 line-through' : 'text-ink-2'}>
              {citation.record_id.slice(0, 18)}
            </Mono>
          </Row>
          <Row label="Data source">
            <span className="text-ink-2">{orDash(citation.data_source)}</span>
          </Row>
          <Row label="Country">
            <span className="text-ink-2">{orDash(citation.country)}</span>
          </Row>
        </Cell>

        {/* 2. the numbers for the period */}
        <Cell title={`Numbers · ${orDash(citation.period_label)}`}>
          {moved ? (
            <p className="text-[11px] leading-relaxed text-ink-4">
              The values cannot be read back because the row is gone. The period label
              above is what the citation recorded.
            </p>
          ) : (
            <>
              <Row label="Actual">
                <span className="tnum font-semibold text-ink-1">
                  {formatValue(citation.actual)}
                </span>
              </Row>
              <Row label="Target">
                <span className="tnum text-ink-2">{formatValue(citation.target)}</span>
              </Row>
              <Row label="Outlook">
                <span className="tnum text-ink-2">{formatValue(citation.outlook)}</span>
              </Row>
              <Row label="Unit">
                <span className="text-ink-2">{orDash(citation.unit_en)}</span>
              </Row>
              <Row label="Granularity">
                <Mono className="text-ink-2">{orDash(citation.granularity)}</Mono>
              </Row>
            </>
          )}
        </Cell>

        {/* 3. the indicator ids */}
        <Cell title="Indicator">
          {moved ? (
            <p className="text-[11px] leading-relaxed text-ink-4">
              No ids resolved. The denormalised indicator name is{' '}
              <span className="text-ink-3">{orDash(citation.indicator)}</span>.
            </p>
          ) : (
            <>
              <Row label="Published id">
                <Mono className="text-ink-2" title={citation.published_indicator_detail_id ?? ''}>
                  {citation.published_indicator_detail_id?.slice(0, 18) ?? DASH}
                </Mono>
              </Row>
              <Row label="Source id">
                <Mono className="text-ink-2" title={citation.indicator_detail_id ?? ''}>
                  {citation.indicator_detail_id?.slice(0, 18) ?? DASH}
                </Mono>
              </Row>
              <Row label="Indicator id">
                <Mono className="text-ink-2" title={citation.indicator_id ?? ''}>
                  {citation.indicator_id?.slice(0, 18) ?? DASH}
                </Mono>
              </Row>
              {linkId && (
                <Link
                  to={`/catalogue/${linkId}`}
                  className="mt-1 inline-block text-[11.5px] font-medium text-maroon hover:underline"
                >
                  Open in the catalogue →
                </Link>
              )}
            </>
          )}
        </Cell>

        {/* 4. the source file */}
        <Cell title="Source file">
          {moved ? (
            <p className="text-[11px] leading-relaxed text-ink-4">
              The load that produced this row has been replaced, so no file or digest is
              recorded against it any more.
            </p>
          ) : (
            <>
              <Row label="File">
                <span className="break-all text-[11px] text-ink-2">
                  {orDash(citation.source_file)}
                </span>
              </Row>
              <Row label="Digest">
                <CopyDigest digest={citation.file_sha256} />
              </Row>
              <Row label="Loaded">
                <span className="text-ink-2" title={formatAbsolute(citation.loaded_at)}>
                  {citation.loaded_at ? formatRelative(citation.loaded_at) : DASH}
                </span>
              </Row>
            </>
          )}
        </Cell>
      </div>
    </section>
  )
}

function Cell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
      <span className="shrink-0 text-ink-4">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}
