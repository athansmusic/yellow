/** Small form helpers for the admin pages. */
export function Field({ label, name, defaultValue, hint, required, rows }: { label: string; name: string; defaultValue?: string; hint?: string; required?: boolean; rows?: number }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="eyebrow">{label}</span>
      {rows ? <textarea name={name} defaultValue={defaultValue} required={required} rows={rows} className="field" /> : <input name={name} defaultValue={defaultValue} required={required} className="field" />}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Saved({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mt-4 border border-yellow/60 bg-yellow/10 p-3 text-sm">
      {children}
    </p>
  );
}
