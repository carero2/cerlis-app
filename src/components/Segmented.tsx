/** Control segmentado estilo iOS. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  const idx = options.findIndex((o) => o.value === value)
  return (
    <div className="segmented" role="radiogroup" style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: idx }}>
      <span className="segmented-thumb" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
