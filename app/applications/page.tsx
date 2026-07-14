"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api, Application, downloadApplicationDoc } from "@/lib/api";

const GEM_ADVANCE_SEARCH = "https://bidplus.gem.gov.in/advance-search";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    ready: "bg-emerald-50 text-emerald-700",
    submitted: "bg-brand-50 text-brand-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApps(await api.applications());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(a: Application) {
    if (!confirm(`Delete the draft application for "${a.tender_title}"?`)) return;
    await api.deleteApplication(a.id);
    load();
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Applications
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Your AI-drafted tender applications.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-slate-600">No applications yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Open a tender in{" "}
            <Link href="/" className="font-medium text-brand-600 hover:underline">
              Tenders
            </Link>{" "}
            and click <b>Apply</b> to draft one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.tender_reference && (
                      <span className="font-mono text-xs text-slate-400">
                        {a.tender_reference}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900">
                    {a.tender_title}
                  </h3>
                  {a.draft?.summary && (
                    <p className="mt-0.5 text-sm text-slate-500">
                      {a.draft.summary}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {openId === a.id ? "Hide" : "View"}
                  </button>
                  <button
                    onClick={() => remove(a)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {openId === a.id && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {a.draft?.cover_letter && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cover letter
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {a.draft.cover_letter}
                      </p>
                    </div>
                  )}
                  {(a.draft?.document_checklist?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Documents to attach
                      </div>
                      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                        {a.draft?.document_checklist?.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {a.draft?.emd_note && (
                    <p className="text-sm text-slate-600">
                      <b>EMD:</b> {a.draft.emd_note}
                    </p>
                  )}
                  {a.tender_reference && (
                    <p className="text-sm text-slate-500">
                      To submit: in GeM Advance Search, paste bid{" "}
                      <b className="font-mono">{a.tender_reference}</b> → open → click
                      Participate.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={GEM_ADVANCE_SEARCH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Open GeM Advance Search ↗
                    </a>
                    <button
                      onClick={() => downloadApplicationDoc(a.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      ⬇ Download application
                    </button>
                    {a.tender_url && (
                      <a
                        href={a.tender_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View bid details ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
