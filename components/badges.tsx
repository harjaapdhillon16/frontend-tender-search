const TYPE_STYLES: Record<string, { label: string; cls: string }> = {
  tender: { label: "Govt Tender", cls: "bg-emerald-100 text-emerald-700" },
};

const SOURCE_LABELS: Record<string, string> = {
  gem: "GeM",
};

export function TypePill({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? {
    label: type,
    cls: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function SourcePill({ source }: { source: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

export function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  const cls =
    pct >= 70
      ? "bg-emerald-50 text-emerald-700"
      : pct >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {pct}% match
    </span>
  );
}

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}
