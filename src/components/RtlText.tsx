const ARABIC = /[؀-ۿݐ-ݿ]/

export function isArabic(text: string | null | undefined): boolean {
  return Boolean(text && ARABIC.test(text))
}

/**
 * Arabic content renders RTL on its own element only — the panel chrome stays
 * LTR English. Pass `language` when the row states it; otherwise the script
 * is detected from the text.
 */
export function RtlText({
  children,
  language,
  className = '',
  as: Tag = 'span',
}: {
  children: string | null | undefined
  language?: string | null
  className?: string
  as?: 'span' | 'p' | 'div'
}) {
  const text = children?.trim()
  if (!text) return <span className="text-ink-4">—</span>

  const rtl = language === 'ar' || isArabic(text)
  return (
    <Tag
      dir={rtl ? 'rtl' : 'ltr'}
      lang={rtl ? 'ar' : undefined}
      className={`${rtl ? 'arabic text-right' : ''} ${className}`}
    >
      {text}
    </Tag>
  )
}
