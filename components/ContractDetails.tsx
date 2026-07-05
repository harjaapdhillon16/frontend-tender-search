import { ContractDetails as CD } from "@/lib/api";

function List({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Kv({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default function ContractDetails({ cd }: { cd: CD }) {
  const dates = cd.key_dates || {};
  const dateStr = Object.entries(dates)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join("  ·  ");

  return (
    <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
      {cd.about && (
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">About: </span>
          {cd.about}
        </p>
      )}
      {cd.scope_of_work && (
        <p className="text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Scope: </span>
          {cd.scope_of_work}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kv label="Est. Value" value={cd.estimated_value} />
        <Kv label="EMD" value={cd.emd} />
        <Kv label="Min Turnover" value={cd.min_turnover} />
        <Kv label="Delivery" value={cd.delivery_period} />
        <Kv label="Location" value={cd.delivery_location} />
        <Kv label="MSE / Startup" value={cd.mse_startup_exemption} />
      </div>

      {dateStr && (
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Key dates — </span>
          {dateStr}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <List label="Key requirements" items={cd.key_requirements} />
        <List label="Eligibility" items={cd.eligibility} />
      </div>
      <List label="Documents required" items={cd.documents_required} />

      {cd.contact && (
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Contact: </span>
          {cd.contact}
        </div>
      )}
      {cd.note && <p className="text-xs italic text-slate-400">{cd.note}</p>}
    </div>
  );
}
