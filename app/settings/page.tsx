"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PasswordInput from "@/components/PasswordInput";
import { api, Keyword } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  // keywords
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newTerm, setNewTerm] = useState("");
  const [kwBusy, setKwBusy] = useState(false);
  const [kwError, setKwError] = useState<string | null>(null);

  // interval
  const [hours, setHours] = useState(user?.refresh_hours ?? 24);
  const [intervalMsg, setIntervalMsg] = useState<string | null>(null);

  // password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const loadKeywords = useCallback(async () => {
    try {
      setKeywords(await api.keywords());
    } catch (e) {
      setKwError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);
  useEffect(() => {
    if (user) setHours(user.refresh_hours);
  }, [user]);

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    const term = newTerm.trim();
    if (!term) return;
    setKwBusy(true);
    setKwError(null);
    try {
      await api.addKeyword(term);
      setNewTerm("");
      await loadKeywords();
    } catch (e) {
      setKwError(e instanceof Error ? e.message : String(e));
    } finally {
      setKwBusy(false);
    }
  }

  async function toggleKeyword(k: Keyword) {
    await api.updateKeyword(k.id, { active: !k.active });
    loadKeywords();
  }
  async function removeKeyword(k: Keyword) {
    if (!confirm(`Remove keyword "${k.term}" and its tenders?`)) return;
    await api.deleteKeyword(k.id);
    loadKeywords();
  }

  async function saveInterval(e: React.FormEvent) {
    e.preventDefault();
    setIntervalMsg(null);
    try {
      const u = await api.updateSettings({ refresh_hours: hours });
      setUser(u);
      setIntervalMsg("Saved. Your keywords now refresh every " + u.refresh_hours + "h.");
    } catch (e) {
      setIntervalMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    try {
      await api.changePassword(curPw, newPw);
      setCurPw("");
      setNewPw("");
      setPwMsg("Password updated.");
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Settings
      </h1>

      <div className="space-y-5">
        <Section
          title="Keywords"
          desc="Terms we monitor on GeM for you. New keywords fetch their first results right away, then refresh on your schedule."
        >
          <form onSubmit={addKeyword} className="mb-4 flex gap-2">
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="e.g. Octagonal pole"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={kwBusy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {kwBusy ? "Adding…" : "Add keyword"}
            </button>
          </form>
          {kwError && (
            <p className="mb-2 text-sm text-rose-600">{kwError}</p>
          )}
          {keywords.length === 0 ? (
            <p className="text-sm text-slate-400">No keywords yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {keywords.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <span className="font-medium text-slate-800">{k.term}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {k.result_count} tenders
                      {!k.active && " · paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={() => toggleKeyword(k)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      {k.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => removeKeyword(k)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Search interval"
          desc="How often we re-run all your keywords on GeM."
        >
          <form onSubmit={saveInterval} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Every</span>
            <input
              type="number"
              min={1}
              max={720}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <span className="text-sm text-slate-600">hours</span>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save
            </button>
            {intervalMsg && (
              <span className="text-sm text-slate-500">{intervalMsg}</span>
            )}
          </form>
        </Section>

        <Section title="Change password">
          <form onSubmit={changePassword} className="max-w-sm space-y-3">
            <PasswordInput
              required
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <PasswordInput
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 6 chars)"
              autoComplete="new-password"
            />
            {pwErr && <p className="text-sm text-rose-600">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Update password
            </button>
          </form>
        </Section>
      </div>
    </Shell>
  );
}
