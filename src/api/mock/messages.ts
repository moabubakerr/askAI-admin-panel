import type { Citation, MessageRow, Provenance, SourceTable } from '../types'
import { CATALOGUE_BY_KEY } from './indicators'
import { guid, sha256 } from './ids'

/**
 * Sixteen invented messages across eight sessions. The mix is deliberate:
 * Arabic and English, refusals, greetings, unverified answers, low ratings
 * with comments, and citations whose rows no longer resolve.
 */

interface MessageSeed extends Omit<MessageRow, 'message_id' | 'session_id'> {
  key: string
  session: number
}

const M: MessageSeed[] = [
  /* session 1 — English, clean value lookups */
  {
    key: 'm01',
    session: 1,
    asked_at: '2026-09-03T14:11:22Z',
    endpoint: '/chat',
    language: 'en',
    question: 'What was the consumer price index in July 2026?',
    answer:
      'The general consumer price index for July 2026 was 121.86 (2018 = 100), up from 121.58 in June 2026.',
    answered: true,
    answer_shape: 'value',
    indicator: 'Consumer price index',
    period_label: 'Jul 2026',
    verified: true,
    readable: true,
    latency_ms: 1420,
    rating: 5,
    comment: null,
  },
  {
    key: 'm02',
    session: 1,
    asked_at: '2026-09-03T14:14:03Z',
    endpoint: '/chat',
    language: 'en',
    question: 'And how does that compare with a year earlier?',
    answer:
      'In July 2025 the index stood at 119.42, so the July 2026 reading of 121.86 is 2.04 percent higher year on year.',
    answered: true,
    answer_shape: 'period_comparison',
    indicator: 'Consumer price index',
    period_label: 'Jul 2026',
    verified: true,
    readable: true,
    latency_ms: 1180,
    rating: null,
    comment: null,
  },

  /* session 2 — Arabic, greeting then a value lookup */
  {
    key: 'm03',
    session: 2,
    asked_at: '2026-09-08T09:50:11Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'مرحبا',
    answer:
      'مرحبا بك. يمكنني الإجابة عن أسئلة حول المؤشرات الاقتصادية المنشورة. عن أي مؤشر تريد أن تسأل؟',
    answered: true,
    answer_shape: 'greeting',
    indicator: null,
    period_label: null,
    verified: null,
    readable: true,
    latency_ms: 340,
    rating: null,
    comment: null,
  },
  {
    key: 'm04',
    session: 2,
    asked_at: '2026-09-08T09:52:47Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'ما هو الرقم القياسي لأسعار المستهلك لشهر أغسطس 2026؟',
    answer:
      'بلغ الرقم القياسي العام لأسعار المستهلك في أغسطس 2026 مستوى 122.07 (2018 = 100)، بارتفاع نسبته 0.17 بالمئة عن شهر يوليو 2026.',
    answered: true,
    answer_shape: 'value',
    indicator: 'Consumer price index',
    period_label: 'Aug 2026',
    verified: true,
    readable: true,
    latency_ms: 2810,
    rating: 4,
    comment: null,
  },

  /* session 3 — a refusal on a stale indicator, then the figure that does exist */
  {
    key: 'm05',
    session: 3,
    asked_at: '2026-09-12T10:05:36Z',
    endpoint: '/chat',
    language: 'en',
    question: 'What is the unemployment rate right now?',
    answer:
      'I do not have an unemployment figure for the current quarter. The most recent period loaded for this indicator is Q3 2024.',
    answered: false,
    answer_shape: 'refusal',
    indicator: null,
    period_label: null,
    verified: null,
    readable: true,
    latency_ms: 980,
    rating: 2,
    comment:
      'It said it had no data but the figure is published on the statistics site. This is the kind of answer that makes people stop using it.',
  },
  {
    key: 'm06',
    session: 3,
    asked_at: '2026-09-12T10:08:14Z',
    endpoint: '/chat',
    language: 'en',
    question: 'Then what is the most recent unemployment figure you do have?',
    answer:
      'The most recent loaded unemployment rate is 0.13 percent for Q3 2024, against a 2030 target of 0.10 percent.',
    answered: true,
    answer_shape: 'value',
    indicator: 'Unemployment rate',
    period_label: 'Q3 2024',
    verified: true,
    readable: true,
    latency_ms: 1660,
    rating: 3,
    comment: null,
  },

  /* session 4 — Arabic comparison that failed the numeric check, then a refusal */
  {
    key: 'm07',
    session: 4,
    asked_at: '2026-09-16T15:33:02Z',
    endpoint: '/chat/stream',
    language: 'ar',
    question: 'قارن معدل نمو الناتج المحلي الإجمالي بين الربع الأول والربع الثاني من 2026',
    answer:
      'بلغ معدل نمو الناتج المحلي الإجمالي الحقيقي 2.4 بالمئة في الربع الثاني من 2026 مقابل 2.1 بالمئة في الربع الأول، أي بزيادة قدرها 0.3 نقطة مئوية.',
    answered: true,
    answer_shape: 'country_comparison',
    indicator: 'Real GDP growth rate',
    period_label: 'Q2 2026',
    verified: false,
    readable: true,
    latency_ms: 4120,
    rating: 2,
    comment: 'الأرقام لا تتطابق مع التقرير المنشور للربع الثاني. الرجاء التحقق من المصدر.',
  },
  {
    key: 'm08',
    session: 4,
    asked_at: '2026-09-16T15:37:41Z',
    endpoint: '/chat/stream',
    language: 'ar',
    question: 'ما هو متوسط العمر المتوقع في 2026؟',
    answer:
      'لا تتوفر لدي بيانات متوسط العمر المتوقع لعام 2026. آخر فترة محملة لهذا المؤشر هي عام 2022.',
    answered: false,
    answer_shape: 'refusal',
    indicator: null,
    period_label: null,
    verified: null,
    readable: true,
    latency_ms: 1650,
    rating: null,
    comment: null,
  },

  /* session 5 — a series whose older cited rows no longer resolve */
  {
    key: 'm09',
    session: 5,
    asked_at: '2026-09-18T11:20:55Z',
    endpoint: '/chat',
    language: 'en',
    question: 'Show me life expectancy at birth over time',
    answer:
      'Life expectancy at birth rose from 79.4 years in 2015 to 80.6 years in 2022, the most recent year loaded. The 2030 target is 82 years.',
    answered: true,
    answer_shape: 'series',
    indicator: 'Life expectancy at birth',
    period_label: '2022',
    verified: true,
    readable: true,
    latency_ms: 2870,
    rating: 4,
    comment: null,
  },
  {
    key: 'm10',
    session: 5,
    asked_at: '2026-09-18T11:24:09Z',
    endpoint: '/chat',
    language: 'en',
    question: 'Is that the latest available?',
    answer:
      'It is the latest loaded here. The series ends at 2022, so anything after that is not available to me.',
    answered: true,
    answer_shape: 'direction',
    indicator: 'Life expectancy at birth',
    period_label: '2022',
    verified: true,
    readable: true,
    latency_ms: 1240,
    rating: null,
    comment: null,
  },

  /* session 6 — Arabic greeting, then a refusal with a strongly worded comment */
  {
    key: 'm11',
    session: 6,
    asked_at: '2026-09-20T08:41:18Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'السلام عليكم',
    answer: 'وعليكم السلام. كيف يمكنني مساعدتك في بيانات المؤشرات الاقتصادية؟',
    answered: true,
    answer_shape: 'greeting',
    indicator: null,
    period_label: null,
    verified: null,
    readable: true,
    latency_ms: 310,
    rating: null,
    comment: null,
  },
  {
    key: 'm12',
    session: 6,
    asked_at: '2026-09-20T08:44:52Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'ما هي نسبة الأنشطة غير النفطية من الناتج المحلي الإجمالي لعام 2025؟',
    answer:
      'لا تتوفر لدي بيانات هذا المؤشر لعام 2025. آخر فترة محملة هي عام 2024.',
    answered: false,
    answer_shape: 'refusal',
    indicator: null,
    period_label: null,
    verified: null,
    readable: true,
    latency_ms: 1180,
    rating: 1,
    comment:
      'رقم عام 2025 موجود في النشرة السنوية المنشورة. هذه هي المحاولة الثالثة ولا يزال يرفض الإجابة.',
  },

  /* session 7 — Arabic population lookups, the second one unverified */
  {
    key: 'm13',
    session: 7,
    asked_at: '2026-09-21T13:02:31Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'كم عدد سكان قطر؟',
    answer:
      'بلغ إجمالي عدد السكان في منتصف عام 2026 نحو 3,081,000 نسمة وفق أحدث التقديرات المحملة.',
    answered: true,
    answer_shape: 'value',
    indicator: 'Total population',
    period_label: '2026',
    verified: true,
    readable: true,
    latency_ms: 2480,
    rating: 5,
    comment: null,
  },
  {
    key: 'm14',
    session: 7,
    asked_at: '2026-09-21T13:05:47Z',
    endpoint: '/chat',
    language: 'ar',
    question: 'وما هو معدل النمو السنوي للسكان؟',
    answer:
      'ارتفع عدد السكان من نحو 3,050,000 في 2025 إلى 3,081,000 في 2026، أي بمعدل نمو سنوي يبلغ 1.0 بالمئة.',
    answered: true,
    answer_shape: 'growth_rate',
    indicator: 'Total population',
    period_label: '2026',
    verified: false,
    readable: true,
    latency_ms: 3640,
    rating: null,
    comment: null,
  },

  /* session 8 — a ranking built on indicators without targets, then a definition */
  {
    key: 'm15',
    session: 8,
    asked_at: '2026-09-22T09:14:12Z',
    endpoint: '/chat',
    language: 'en',
    question: 'Which indicators are performing worst against their 2030 targets?',
    answer:
      'Of the indicators with a 2030 target, the renewable share of electricity generation is furthest from target at 2.9 percent against 20 percent, followed by the non-hydrocarbon share of GDP at 62.4 percent against 70 percent.',
    answered: true,
    answer_shape: 'performance_ranking',
    indicator: 'Renewable share of electricity generation',
    period_label: '2024',
    verified: true,
    readable: true,
    latency_ms: 5210,
    rating: 2,
    comment:
      'It ranked them but three of the five have no target set at all, so the ranking is meaningless without saying which ones were excluded.',
  },
  {
    key: 'm16',
    session: 8,
    asked_at: '2026-09-22T09:16:40Z',
    endpoint: '/chat',
    language: 'en',
    question: 'Explain what polarity means for these indicators',
    answer:
      'Polarity records the direction of improvement. "Higher is better" means a rise is progress, "Lower is better" means a fall is progress, and "Neutral" means the indicator is descriptive and has no preferred direction.',
    answered: true,
    answer_shape: 'definition',
    indicator: null,
    period_label: null,
    verified: true,
    readable: true,
    latency_ms: 760,
    rating: null,
    comment: null,
  },
]

/**
 * The seeds carry fixed dates so the spread between them is deliberate, but they
 * are shifted on load so the newest sits twenty minutes in the past. Otherwise
 * the fixtures drift into the future and the panel reports "in 18 minutes".
 */
const NEWEST_SEED = Math.max(...M.map((seed) => Date.parse(seed.asked_at)))
const SHIFT = Date.now() - 20 * 60_000 - NEWEST_SEED

function shifted(iso: string): string {
  return new Date(Date.parse(iso) + SHIFT).toISOString()
}

export const MESSAGES: MessageRow[] = M.map((seed) => ({
  message_id: guid(`message-${seed.key}`),
  session_id: guid(`session-${seed.session}`),
  asked_at: shifted(seed.asked_at),
  endpoint: seed.endpoint,
  language: seed.language,
  question: seed.question,
  answer: seed.answer,
  answered: seed.answered,
  answer_shape: seed.answer_shape,
  indicator: seed.indicator,
  period_label: seed.period_label,
  verified: seed.verified,
  readable: seed.readable,
  latency_ms: seed.latency_ms,
  rating: seed.rating,
  comment: seed.comment,
}))

const MESSAGE_ID_BY_KEY = new Map(M.map((seed) => [seed.key, guid(`message-${seed.key}`)]))

export function messageIdFor(key: string): string {
  const id = MESSAGE_ID_BY_KEY.get(key)
  if (!id) throw new Error(`unknown fixture message ${key}`)
  return id
}

/* ---- citations ---- */

const FILES: Record<SourceTable, string> = {
  published_data_points: 'published_data_points_2026_09_01.xlsx',
  indicator_values: 'indicator_values_export_2026_09_01.xlsx',
  indicator_analysis: 'indicator_analysis_2026_08_15.xlsx',
}

const LOADED_AT: Record<SourceTable, string> = {
  published_data_points: '2026-09-01T02:14:38Z',
  indicator_values: '2026-09-01T02:16:51Z',
  indicator_analysis: '2026-08-15T03:02:10Z',
}

interface CiteSeed {
  position: number
  key: string
  table: SourceTable
  /** false = the row no longer exists after an ETL reload. Normal, not an error. */
  found: boolean
  period: string
  periodDate?: string
  actual?: number | null
  target?: number | null
  outlook?: number | null
  isMain?: boolean
  country?: string
}

function cite(messageKey: string, seed: CiteSeed): Citation {
  const indicator = CATALOGUE_BY_KEY.get(seed.key)
  if (!indicator) throw new Error(`unknown fixture indicator ${seed.key}`)

  const denormalised = {
    position: seed.position,
    source_table: seed.table,
    record_id: guid(`${messageKey}-cite-${seed.position}`),
    // These four are copied into the citation at answer time, so they survive
    // a reload even when the row they came from does not.
    indicator: indicator.name_en,
    data_source: indicator.data_source_en,
    period_label: seed.period,
    country: seed.country ?? 'Qatar',
    record_found: seed.found,
  }

  if (!seed.found) {
    return {
      ...denormalised,
      published_indicator_detail_id: null,
      indicator_id: null,
      indicator_detail_id: null,
      indicator_name_en: null,
      indicator_name_ar: null,
      unit_en: null,
      is_main: null,
      actual: null,
      target: null,
      outlook: null,
      period_date: null,
      granularity: null,
      source_file: null,
      file_sha256: null,
      loaded_at: null,
    }
  }

  return {
    ...denormalised,
    published_indicator_detail_id: indicator.published_detail_id,
    indicator_id: indicator.indicator_id,
    indicator_detail_id: indicator.indicator_detail_id,
    indicator_name_en: indicator.name_en,
    indicator_name_ar: indicator.name_ar,
    unit_en: indicator.unit_en,
    is_main: seed.isMain ?? indicator.is_main ?? null,
    actual: seed.actual ?? null,
    target: seed.target ?? null,
    outlook: seed.outlook ?? null,
    period_date: seed.periodDate ?? null,
    granularity: indicator.series[0]?.granularity ?? null,
    source_file: FILES[seed.table],
    file_sha256: sha256(FILES[seed.table]),
    loaded_at: LOADED_AT[seed.table],
  }
}

const CITATION_SEEDS: Record<string, CiteSeed[]> = {
  m01: [
    {
      position: 1, key: 'cpi', table: 'published_data_points', found: true,
      period: 'Jul 2026', periodDate: '2026-07-01', actual: 121.86, isMain: true,
    },
  ],
  m02: [
    {
      position: 1, key: 'cpi', table: 'published_data_points', found: true,
      period: 'Jul 2026', periodDate: '2026-07-01', actual: 121.86, isMain: true,
    },
    {
      position: 2, key: 'cpi', table: 'published_data_points', found: true,
      period: 'Jul 2025', periodDate: '2025-07-01', actual: 119.42, isMain: true,
    },
  ],
  // Greetings cite nothing. An empty list is a valid result.
  m03: [],
  m04: [
    {
      position: 1, key: 'cpi', table: 'published_data_points', found: true,
      period: 'Aug 2026', periodDate: '2026-08-01', actual: 122.07, isMain: true,
    },
  ],
  // Refusals cite nothing either.
  m05: [],
  m06: [
    {
      position: 1, key: 'unemployment', table: 'published_data_points', found: false,
      period: 'Q3 2024',
    },
  ],
  m07: [
    {
      position: 1, key: 'gdp-growth', table: 'published_data_points', found: true,
      period: 'Q2 2026', periodDate: '2026-04-01', actual: 2.4, target: 4, isMain: true,
    },
    {
      position: 2, key: 'gdp-growth', table: 'published_data_points', found: true,
      period: 'Q1 2026', periodDate: '2026-01-01', actual: 2.1, target: 4, isMain: true,
    },
    {
      position: 3, key: 'gdp-growth', table: 'indicator_values', found: false,
      period: 'Q2 2026',
    },
  ],
  m08: [],
  m09: [
    {
      position: 1, key: 'life-expectancy', table: 'published_data_points', found: true,
      period: '2022', periodDate: '2022-01-01', actual: 80.6, target: 82, isMain: true,
    },
    {
      position: 2, key: 'life-expectancy', table: 'published_data_points', found: true,
      period: '2021', periodDate: '2021-01-01', actual: 80.4, target: 82, isMain: true,
    },
    {
      position: 3, key: 'life-expectancy', table: 'published_data_points', found: false,
      period: '2016',
    },
    {
      position: 4, key: 'life-expectancy', table: 'published_data_points', found: false,
      period: '2015',
    },
  ],
  m10: [
    {
      position: 1, key: 'life-expectancy', table: 'published_data_points', found: true,
      period: '2022', periodDate: '2022-01-01', actual: 80.6, target: 82, isMain: true,
    },
  ],
  m11: [],
  m12: [],
  m13: [
    {
      position: 1, key: 'population', table: 'published_data_points', found: true,
      period: '2026', periodDate: '2026-01-01', actual: 3081000, isMain: true,
    },
  ],
  m14: [
    {
      position: 1, key: 'population', table: 'published_data_points', found: true,
      period: '2026', periodDate: '2026-01-01', actual: 3081000, isMain: true,
    },
    {
      position: 2, key: 'population', table: 'published_data_points', found: true,
      period: '2025', periodDate: '2025-01-01', actual: 3050000, isMain: true,
    },
  ],
  m15: [
    {
      position: 1, key: 'renewables', table: 'published_data_points', found: true,
      period: '2024', periodDate: '2024-01-01', actual: 2.9, target: 20, isMain: false,
    },
    {
      position: 2, key: 'non-hydrocarbon', table: 'published_data_points', found: true,
      period: '2024', periodDate: '2024-01-01', actual: 62.4, target: 70, isMain: false,
    },
    {
      position: 3, key: 'lfpr', table: 'published_data_points', found: true,
      period: '2025', periodDate: '2025-01-01', actual: 88.5, target: 90, isMain: true,
    },
    {
      position: 4, key: 'unemployment', table: 'published_data_points', found: false,
      period: 'Q3 2024',
    },
    {
      position: 5, key: 'gdp-growth', table: 'indicator_analysis', found: true,
      period: 'Q2 2026', periodDate: '2026-04-01', actual: null, isMain: false,
    },
  ],
  // A definition answered from the prompt, citing no data at all.
  m16: [],
}

export const PROVENANCE = new Map<string, Provenance>(
  M.map((seed) => {
    const citations = (CITATION_SEEDS[seed.key] ?? []).map((c) => cite(seed.key, c))
    const message = MESSAGES.find((row) => row.message_id === messageIdFor(seed.key))
    if (!message) throw new Error(`no message row for ${seed.key}`)
    return [
      message.message_id,
      {
        message,
        unresolved_records: citations.filter((c) => !c.record_found).length,
        citations,
      },
    ]
  }),
)
