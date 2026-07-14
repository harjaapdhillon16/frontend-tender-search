"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import ResultCard from "@/components/ResultCard";
import { api, Keyword, Result, Stats } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}

export default function TendersPage() {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sortBy, setSortBy] = useState("relevance");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, st, kw] = await Promise.all([
        api.results({
          sort: sortBy,
          keyword_id: keywordFilter || undefined,
          open_only: openOnly || undefined,
        }),
        api.stats(),
        api.keywords(),
      ]);
      setResults(res);
      setStats(st);
      setKeywords(kw);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sortBy, keywordFilter, openOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    if (!q.trim()) return results;
    const needle = q.toLowerCase();
    return results.filter((r) => r.title.toLowerCase().includes(needle));
  }, [results, q]);

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tenders
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Government tenders (GeM) matched to your keywords · auto-refreshed
            every {user?.refresh_hours ?? 24}h
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          ↻ Reload
        </button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatTile label="Tenders" value={stats.total_results} />
          <StatTile label="With document" value={stats.with_document} />
          <StatTile label="Keywords" value={keywords.length} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by title…"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={keywordFilter}
          onChange={(e) => setKeywordFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All keywords</option>
          {keywords.map((k) => (
            <option key={k.id} value={k.id}>
              {k.term}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="deadline">Closing date (soonest)</option>
          <option value="deadline_desc">Closing date (latest)</option>
          <option value="recent">Recently added</option>
        </select>
        <button
          type="button"
          role="switch"
          aria-checked={openOnly}
          onClick={() => setOpenOnly((v) => !v)}
          title="Show only tenders whose closing date hasn't passed"
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            openOnly
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span
            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition ${
              openOnly ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                openOnly ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
          Can apply only
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : keywords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-slate-600">No keywords yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Add keywords in{" "}
            <Link href="/settings" className="font-medium text-brand-600 hover:underline">
              Settings
            </Link>{" "}
            to start monitoring tenders.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400">
          {results.length > 0
            ? "No tenders match your filter."
            : openOnly
              ? "No open tenders right now. Turn off “Can apply only” to see closed ones too."
              : "Your keywords are being searched — tenders will appear shortly."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </Shell>
  );
}
