"use client";

import { useEffect, useState } from "react";
import {
  Application,
  ApplicationDraft,
  RequiredDocument,
  SellerProfile,
  api,
  downloadApplicationDoc,
  downloadApplyCompanion,
  downloadDocumentPdf,
  draftApplicationStream,
  Result,
} from "@/lib/api";
import { partialParse } from "@/lib/partialJson";
import { useAuth } from "@/lib/auth";

// GeM has no participate deep-link (it's a login-only encrypted hash). Advance
// Search is the way in: paste the bid number, open the bid, click Participate.
const GEM_ADVANCE_SEARCH = "https://bidplus.gem.gov.in/advance-search";

type Step = "offer" | "drafting" | "review" | "documents" | "apply";

function CopyBtn({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function CopyRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
      <div className="min-w-0 text-sm">
        <span className="text-slate-400">{label}: </span>
        <span className="break-words text-slate-700">{value}</span>
      </div>
      <CopyBtn value={value} />
    </div>
  );
}

function AssistStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {n}
        </span>
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </div>
      <div className="space-y-1.5 pl-7 text-sm text-slate-600">{children}</div>
    </div>
  );
}

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

function DocumentsStep({
  application,
  profile,
  onBack,
  onContinue,
}: {
  application: Application;
  profile: SellerProfile;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [docs, setDocs] = useState<RequiredDocument[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  function seed(list: RequiredDocument[]) {
    const persisted = ((application.inputs?.document_answers as Record<
      string,
      Record<string, string>
    >) || {});
    const prof = profile as Record<string, unknown>;
    const seeded: Record<string, Record<string, string>> = {};
    for (const d of list) {
      if (d.category !== "generate") continue;
      const a: Record<string, string> = { ...(persisted[d.id] || {}) };
      for (const f of d.fields || []) {
        if (a[f.name]) continue;
        if (f.prefill && prof[f.prefill] != null && prof[f.prefill] !== "") {
          a[f.name] = String(prof[f.prefill]);
        }
      }
      seeded[d.id] = a;
    }
    setAnswers(seeded);
  }

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.requiredDocuments(application.id, refresh);
      setDocs(res.documents);
      seed(res.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.id]);

  function setAnswer(docId: string, field: string, val: string) {
    setAnswers((s) => ({ ...s, [docId]: { ...(s[docId] || {}), [field]: val } }));
  }

  async function generate(doc: RequiredDocument) {
    setBusyId(doc.id);
    setError(null);
    try {
      await downloadDocumentPdf(application.id, doc.id, answers[doc.id] || {});
      setDoneIds((s) => new Set(s).add(doc.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const genDocs = (docs || []).filter((d) => d.category === "generate");
  const upDocs = (docs || []).filter((d) => d.category === "upload");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        These are the documents <b>this bid</b> requires. Fill the details and
        generate the ones we can prepare as ready-to-sign PDFs; obtain the
        third-party ones yourself. Then upload them all on GeM.
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading && (
        <p className="flex items-center gap-2 py-6 text-sm text-brand-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
          Reading the bid&apos;s document requirements…
        </p>
      )}

      {!loading && docs && docs.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Couldn&apos;t detect specific document requirements for this bid. You can
          still proceed and upload your standard bid documents on GeM.
        </p>
      )}

      {!loading && genDocs.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            We can generate ({genDocs.length})
          </div>
          {genDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-0.5 text-sm font-semibold text-slate-800">
                {doc.title}
              </div>
              {doc.why && <div className="mb-2 text-xs text-slate-500">{doc.why}</div>}
              <div className="space-y-2.5">
                {(doc.fields || []).map((f) => (
                  <div key={f.name}>
                    <label className="mb-0.5 block text-xs font-medium text-slate-600">
                      {f.label}
                      {f.required && <span className="text-rose-500"> *</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        value={answers[doc.id]?.[f.name] || ""}
                        onChange={(e) => setAnswer(doc.id, f.name, e.target.value)}
                        placeholder={f.placeholder || ""}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={answers[doc.id]?.[f.name] || ""}
                        onChange={(e) => setAnswer(doc.id, f.name, e.target.value)}
                        placeholder={f.placeholder || ""}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    )}
                    {f.help && <p className="mt-0.5 text-xs text-slate-400">{f.help}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => generate(doc)}
                  disabled={busyId === doc.id}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busyId === doc.id
                    ? "Generating…"
                    : doneIds.has(doc.id)
                      ? "⬇ Regenerate PDF"
                      : "⬇ Generate PDF"}
                </button>
                {doneIds.has(doc.id) && (
                  <span className="text-xs font-medium text-emerald-600">
                    Downloaded ✓
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && upDocs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Upload your own ({upDocs.length})
          </div>
          {upDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="text-sm font-semibold text-slate-800">{doc.title}</div>
              {doc.why && <div className="text-xs text-slate-500">{doc.why}</div>}
              {doc.upload_hint && (
                <div className="mt-1 text-xs text-slate-600">{doc.upload_hint}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={onContinue}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Continue to apply →
          </button>
          <button
            onClick={onBack}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Back
          </button>
          <button
            onClick={() => load(true)}
            className="ml-auto text-sm font-medium text-slate-400 hover:text-slate-600"
          >
            ↻ Re-analyze
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApplyModal({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const profileFilled = !!user?.seller_profile?.company_name;

  const [step, setStep] = useState<Step>("offer");
  const [inputs, setInputs] = useState({
    offer_price: "",
    delivery_period: "",
    differentiators: "",
    notes: "",
  });
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchOpened, setSearchOpened] = useState(false);

  function openGeMSearch() {
    if (result.reference) {
      navigator.clipboard?.writeText(result.reference).catch(() => {});
    }
    window.open(GEM_ADVANCE_SEARCH, "_blank", "noopener");
    setSearchOpened(true);
  }

  function setField(k: keyof typeof inputs, v: string) {
    setInputs((s) => ({ ...s, [k]: v }));
  }
  function setDraftField(k: keyof ApplicationDraft, v: string) {
    setDraft((d) => ({ ...(d || {}), [k]: v }));
  }

  async function startDraft() {
    setStep("drafting");
    setStreaming(true);
    setError(null);
    let raw = "";
    await draftApplicationStream(result.id, inputs, {
      onDelta: (t) => {
        raw += t;
        const p = partialParse(raw);
        if (p) setDraft(p as ApplicationDraft);
      },
      onDone: (app) => {
        setApplication(app);
        setDraft(app.draft);
        setStreaming(false);
        setStep("review");
      },
      onError: (m) => {
        setError(m || "Drafting failed");
        setStreaming(false);
        setStep("offer");
      },
    });
  }

  async function saveDraft() {
    if (!application) return;
    setSaving(true);
    try {
      const updated = await api.updateApplication(application.id, {
        draft: draft || {},
        status: "ready",
      });
      setApplication(updated);
      setStep("documents");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const tc = draft?.technical_compliance || [];
  const el = draft?.eligibility_response || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 sm:p-6">
      <div className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Apply to tender
            </h2>
            <p className="truncate text-sm text-slate-500">
              {result.title}
              {result.reference ? ` · ${result.reference}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {/* STEP 1 — offer inputs */}
          {step === "offer" && (
            <div className="space-y-3">
              {!profileFilled && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Tip: fill your <b>Seller profile</b> in Settings for a stronger,
                  more specific draft.
                </p>
              )}
              <p className="text-sm text-slate-500">
                Give your offer for this tender. AI will draft a compliant
                application from the tender&apos;s real requirements + your profile.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Your price / rate
                </label>
                <input
                  value={inputs.offer_price}
                  onChange={(e) => setField("offer_price", e.target.value)}
                  placeholder="e.g. ₹5,200 per pole, all inclusive"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Delivery / completion period
                </label>
                <input
                  value={inputs.delivery_period}
                  onChange={(e) => setField("delivery_period", e.target.value)}
                  placeholder="e.g. 12 days from PO"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Key differentiators (optional)
                </label>
                <textarea
                  value={inputs.differentiators}
                  onChange={(e) => setField("differentiators", e.target.value)}
                  placeholder="Why you — in-house manufacturing, past govt supply, certifications…"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button
                onClick={startDraft}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                ✦ Draft application with AI
              </button>
            </div>
          )}

          {/* STEP 2/3 — drafting + review */}
          {(step === "drafting" || step === "review") && (
            <div className="space-y-4">
              {streaming && (
                <p className="flex items-center gap-2 text-sm text-brand-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  Drafting from the tender document &amp; your profile…
                </p>
              )}

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Cover letter
                </div>
                <textarea
                  value={draft?.cover_letter || ""}
                  onChange={(e) => setDraftField("cover_letter", e.target.value)}
                  rows={6}
                  readOnly={step === "drafting"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              {tc.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Technical compliance
                  </div>
                  <div className="space-y-2">
                    {tc.map((x, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <div className="font-medium text-slate-800">
                          {x.requirement}
                        </div>
                        <div className="text-slate-600">{x.response}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {el.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Eligibility
                  </div>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {el.map((x, i) => (
                      <li key={i}>
                        <span className="font-medium">{x.criterion}:</span>{" "}
                        {x.statement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {draft?.pricing_note !== undefined && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Pricing note
                  </div>
                  <textarea
                    value={draft?.pricing_note || ""}
                    onChange={(e) => setDraftField("pricing_note", e.target.value)}
                    rows={2}
                    readOnly={step === "drafting"}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              )}

              <List label="Documents to attach" items={draft?.document_checklist} />
              {draft?.emd_note && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold">EMD: </span>
                  {draft.emd_note}
                </p>
              )}
              {(draft?.risks_or_gaps?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Resolve before submitting
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                    {draft?.risks_or_gaps?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {step === "review" && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save & prepare documents →"}
                  </button>
                  <button
                    onClick={startDraft}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ↻ Redraft
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — prepare documents */}
          {step === "documents" && application && (
            <DocumentsStep
              application={application}
              profile={user?.seller_profile || {}}
              onBack={() => setStep("review")}
              onContinue={() => setStep("apply")}
            />
          )}

          {/* STEP 5 — apply co-pilot */}
          {step === "apply" && application && (
            <div className="space-y-4">
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                Application drafted ✓ Now apply on GeM. There&apos;s no direct link to
                the Participate page, so open <b>Advance Search</b>, paste your bid
                number, open the bid, and click <b>Participate</b>. Every value you need
                is below — one tap to copy. The DSC/eSign Final Submit stays yours.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openGeMSearch}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {searchOpened
                    ? "Bid no. copied ✓ — GeM opened"
                    : "Open GeM Advance Search ↗ (copies bid no.)"}
                </button>
                {result.file_url && (
                  <a
                    href={result.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View bid PDF ↗
                  </a>
                )}
                <button
                  onClick={() => downloadApplicationDoc(application.id)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  ⬇ Download application
                </button>
              </div>

              <div className="space-y-2.5">
                <AssistStep n={1} title="Find & open the bid → Participate">
                  In GeM → <b>Bids / Advance Search</b>, paste the bid number, open it,
                  and click <b>Participate</b>. Pick the listing that matches this bid.
                  <CopyRow label="Bid number" value={result.reference} />
                </AssistStep>

                {tc.length > 0 && (
                  <AssistStep n={2} title="Technical bid — confirm each spec">
                    Mark compliance for each parameter; use these responses:
                    {tc.map((x, i) => (
                      <CopyRow key={i} label={x.requirement} value={x.response} />
                    ))}
                  </AssistStep>
                )}

                <AssistStep n={3} title="Financial bid — enter price">
                  Enter your <b>GST-inclusive</b> price (all charges included).
                  <CopyRow
                    label="Your price"
                    value={
                      String(inputs.offer_price || "") ||
                      draft?.pricing_note ||
                      undefined
                    }
                  />
                </AssistStep>

                {(draft?.document_checklist?.length ?? 0) > 0 && (
                  <AssistStep n={4} title="Upload documents">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {draft?.document_checklist?.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </AssistStep>
                )}

                <AssistStep n={5} title="ATC, declarations & EMD">
                  Accept the buyer&apos;s Additional Terms &amp; Conditions and upload
                  any undertakings.
                  {draft?.emd_note && (
                    <p className="mt-1">
                      <b>EMD:</b> {draft.emd_note}
                    </p>
                  )}
                </AssistStep>

                <AssistStep n={6} title="Sign & Final Submit — this step is yours">
                  Insert your <b>Class-3 DSC token</b> (emSigner) or complete{" "}
                  <b>Aadhaar eSign OTP</b>, then <b>Final Submit</b>. This signed step is
                  legally yours — we never automate it.
                </AssistStep>
              </div>

              <details className="rounded-lg border border-slate-200 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  Prefer browser automation? (advanced)
                </summary>
                <div className="mt-2 space-y-2 text-sm text-slate-500">
                  A local companion opens GeM and walks the flow, pre-filling what&apos;s
                  safe and pausing at login, EMD and DSC. One-time local setup (Python +
                  Playwright).
                  <button
                    onClick={() => downloadApplyCompanion(application.id)}
                    className="block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ⬇ Download automation companion
                  </button>
                </div>
              </details>

              <button
                onClick={onClose}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
