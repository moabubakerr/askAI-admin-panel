/**
 * Copy for the cases where the wording is the design. These strings are
 * specified; do not paraphrase them at the call site.
 */
export const COPY = {
  sessionEnded: 'Your session ended — please sign in again.',

  apiDisabledTitle: 'The admin API is disabled',
  apiDisabledBody:
    'This deployment has the admin API switched off by a server setting. It is not a failed sign-in, and no password will work until the setting is changed on the server.',

  provenanceNotFoundTitle: 'This message was never logged',
  provenanceNotFoundBody:
    'The chat logger is best-effort, so it can under-count. There is no provenance to show for this id because nothing was written for it — not because the answer was wrong.',

  noCitationsTitle: 'This answer used no data.',
  noCitationsBody:
    'An empty citation list is a valid result. Greetings and refusals cite nothing, so there is no chain to follow here.',

  movedRecord: 'No longer in the database',
  movedRecordBody:
    'The ETL truncates and reloads source data, so record ids do not survive a reload. The indicator, period and source below are what the citation copied at the time the answer was given.',

  unresolvedBanner: (n: number) =>
    `${n} of the cited records could not be resolved to a current row. This tells you the data has moved since the answer was given — it does not mean the answer was wrong.`,

  droppedRowsFootnote:
    'Dropped rows are expected in several places and are not failures. Each gap below carries a note explaining what was dropped and why.',

  digestFootnote:
    'These export filenames carry a timestamp the source system does not reliably bump, so a re-cut file can arrive under the old name. The digest is the only thing that moves.',

  notLoadedIntro:
    'No export feeds these tables, so nothing upstream will ever refresh them. That absence is the point: they are written by the running application, not by the ETL.',

  isMainCaveat:
    'For a handful of indicators the flagged row is a component rather than the total, so treat the headline row as a hint and not as a guarantee.',

  tokensInMemory:
    'Admin tokens are held in memory on the server, so a restart signs everyone out. Sessions here do not survive a backend deploy.',

  mockModeNoRequest:
    'Mock mode sends no request. Roles map to the read scopes the API already enforces, so this form will wire straight through once the endpoint exists.',

  staleExplainer:
    'An indicator with rows but an old last period is the commonest reason a reasonable question gets refused. Filter to stale to find those.',

  arabicGapNote:
    'Arabic is tracked as its own column because an Arabic failure rate hidden inside an overall number is a known past incident on this product.',

  liveCallFailed: 'The live API call failed.',
  returnToMock: 'Return to mock data',
} as const
