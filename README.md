# SCEAI Assistant — admin console

A read-only console over the SCEAI economic-statistics assistant's `/admin` API.
Static SPA: React + TypeScript + Vite, Tailwind, TanStack Query, client-side
routing. No backend of its own, and no chart library — the bars are drawn with
plain elements.

## Running

```
npm install
npm run dev
```

Mock mode is **on by default in development**, so the whole console is
explorable with no server, using the demo pair shown on the login screen
(`admin` / `demo`). A **production build defaults to live** — a deployed admin
console that served invented figures until someone noticed the chip would be
worse than one that shows an honest error. The chip in the top bar switches
either way. Scripts: `dev`, `build`, `preview`, `typecheck`.

The API is always **same-origin**. The bundle calls `/api/...` relative and
contains no host, port or scheme — the API serves no CORS headers, so a
cross-origin call would fail preflight in the browser. In development Vite
proxies `/api`; in the container nginx does. The upstream is chosen by
`API_UPSTREAM` on the container, never by rebuilding the bundle. See
[DEPLOY.md](DEPLOY.md).

## Mock mode

`src/api/mock/` holds the fixtures and a transport implementing the same
`AdminTransport` interface as the live client, so screens never know which one
they are using. Everything in there is invented — real responses contain
personal data.

The fixtures are built to exercise the awkward cases rather than the happy
path: 16 messages across 8 sessions in Arabic and English, refusals, greetings,
unanswered questions, answers that failed the numeric check, low ratings with
written comments, citations whose rows no longer resolve, and answers that cite
nothing at all. 12 indicators span current, ageing and stale. 10 export files
feed 7 tables, three of them double-fed.

Message timestamps are shifted on load so the newest sits 20 minutes in the
past; otherwise fixed fixture dates drift into the future and the console
reports "in 18 minutes". Stats are **derived** from the message fixtures rather
than hardcoded, so the Overview cannot disagree with the table beneath it.

The top-bar chip switches to live. If a live call fails, the error state names
what failed and offers a way back to mock data — there is no blank screen.

## Auth

`POST /admin/login` returns a bearer token sent on every other call.

- The token lives in `sessionStorage`, not `localStorage`, so it does not
  outlive the tab. On load it is a claim until `GET /admin/me` agrees.
- Any 401 drops the token and returns to the login screen with exactly
  "Your session ended — please sign in again."
- 503 is a distinct state: the admin API is switched off by a server setting.
  It is not a failed sign-in and no password will work.
- Switching between mock and live ends the session, because a token issued in
  one mode means nothing in the other.
- The user menu carries "simulate expired token (401)" so the 401 path can be
  seen without waiting eight hours, and the login screen has a link for the 503
  state.

Admin tokens are held in memory server-side, so a backend restart signs
everyone out. The console says so in two places rather than leaving people to
discover it.

## Screens

| Route | What it answers |
| --- | --- |
| `/` | Refusal rate and average rating lead; answer shapes worst-rated first |
| `/conversations` | Every logged question, with segmented All / Unverified / Feedback views |
| `/conversations/:messageId` | The provenance chain, question → answer → record → numbers → indicator → source file |
| `/catalogue` | Published indicators with a staleness filter |
| `/catalogue/:indicatorId` | Series against target, plus the export files behind it |
| `/lineage` | The table-to-spreadsheet map, ordered by rows dropped on load |
| `/users` | Panel accounts and recent admin activity (local only) |

## Conventions

- **Read-only.** There are no create, update or delete endpoints, and no form
  implies otherwise. The one exception is the users screen, which is not in the
  API spec and says plainly that it changes nothing outside this browser.
- **Arabic content.** Question, answer, comment and indicator names render
  through `<RtlText>`, which sets `dir="rtl"` and the Arabic face on that
  element only. The chrome stays LTR English.
- **Nulls are normal.** `src/lib/format.ts` renders an em dash. Nothing renders
  "null", "undefined" or "NaN".
- **Empty states say which case it is.** "No rows yet", "no rows match your
  filters" and "this answer cited nothing, which is valid" are three different
  facts and read differently.
- **Copy is part of the design.** The specified wording for the session-ended,
  503, 404, no-citations, moved-records and dropped-rows cases lives in
  `src/copy.ts`, not inlined at call sites.
- **Colour is reserved** for refusals, unverified answers, low ratings and
  dropped-row gaps. Everything else is neutral. Dropped rows are gold or
  neutral, never red, because those gaps are intentional.
- **Keyboard.** Tables take ↑ ↓ to move, Enter to open, Escape to go back, plus
  Home and End.
- **Tabular figures** on every number column.
- Designed for 1280px and up. There is no mobile layout.

## Where the panel works around the API

Three things the screens need are not in the documented payloads. Each is
implemented against the documented routes and labelled in the UI rather than
faked:

1. **The 30-day chart.** `/admin/stats` has no daily series, so in live mode it
   is bucketed from `/admin/messages?from=…&limit=500`. When the total exceeds
   that cap the panel says the earlier days may undercount. The fixtures supply
   the series directly.
2. **Unverified and Feedback views.** There is no filter for the verification
   flag or for ratings, so those two views refine the most recent 500 matching
   messages and say so when more exist. The All messages view pages properly
   server-side at 50 a page.
3. **Staleness sort.** There is no sort parameter, so rows are ordered stalest
   first *within the page the server returned*. The filter bar states this. With
   "stale only" on, the request widens to the 500 cap, which covers the whole
   loaded catalogue in practice.

## Sensitive data

These endpoints return everything users typed into the chat — personal data.

- no analytics, telemetry or error-reporting SDK of any kind
- no logging of message content, including in development
- no CSV export and no copy-whole-table; the only copy action is a single file
  digest
- the session token is in `sessionStorage` only, so it does not outlive the
  tab; `localStorage` is not used at all

Fonts are bundled from `node_modules` via [src/fonts.ts](src/fonts.ts) and
served from this origin. There are no Google Fonts links, no CDN references and
no remote scripts in the shipped HTML: the VM has no guaranteed egress, so
anything fetched at runtime would fail. `deploy/check-bundle.sh` fails the build
if a remote stylesheet, a CDN host or an absolute URL with a port appears in the
output.

## Deployment

Containerised for the on-prem VM: nginx serving the built bundle plus an `/api`
proxy, on host port 17100. See [DEPLOY.md](DEPLOY.md) for the deploy steps, the
`API_UPSTREAM` trade-off, rollback, the offline fallback and a failure table —
and for what the proxy exposes, which is every route the API serves.
