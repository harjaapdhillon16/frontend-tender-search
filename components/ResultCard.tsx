"use client";

import { useState } from "react";
import { ContractDetails as CD, enrichStream, Result } from "@/lib/api";
import { partialParse } from "@/lib/partialJson";
import { ScorePill, SourcePill, TypePill } from "./badges";
import ContractDetails from "./ContractDetails";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

// Strip GeM catalog version tags like "(V2)" / "(V3)" from titles.
function cleanTitle(title: string): string {
  return title.replace(/\s*\(V\d+\)/gi, "").trim();
}

// Did enrichment actually yield contract content (vs. an empty "no document" result)?
function hasContractContent(cd: CD | null): boolean {
  if (!cd) return false;
  if (cd.about) return true;
  if (
    [cd.key_requirements, cd.eligibility, cd.documents_required].some(
      (a) => Array.isArray(a) && a.length > 0,
    )
  )
    return true;
  return [
    cd.scope_of_work,
    cd.estimated_value,
    cd.emd,
    cd.min_turnover,
    cd.delivery_period,
  ].some(Boolean);
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5 text-sm">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

export default function ResultCard({ result }: { result: Result }) {
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [details, setDetails] = useState<CD | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only records with an actual source document can be enriched; others show
  // just the source link. If enrichment discovers there's no usable document,
  // we flip this off so the button disappears.
  const [canEnrich, setCanEnrich] = useState(result.has_document);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (done) return; // already fully loaded
    setStreaming(true);
    setError(null);
    let raw = "";
    await enrichStream(result.id, {
      onDelta: (t) => {
        raw += t;
        const p = partialParse(raw);
        if (p) setDetails(p as CD);
      },
      onDone: (full) => {
        const cd = full.contract_details;
        if (hasContractContent(cd)) {
          setDetails(cd);
        } else {
          // No usable document — hide the button and collapse (link stays).
          setCanEnrich(false);
          setOpen(false);
        }
        setDone(true);
        setStreaming(false);
      },
      onError: () => {
        setError("Couldn't load contract details. Try again.");
        setStreaming(false);
      },
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TypePill type={result.record_type} />
        <SourcePill source={result.source} />
        <ScorePill score={result.relevance_score} />
        {result.cleaned_by_llm && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            ✦ AI-cleaned
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold leading-snug text-slate-900">
        {result.url ? (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 hover:underline"
          >
            {cleanTitle(result.title)}
          </a>
        ) : (
          cleanTitle(result.title)
        )}
      </h3>

      {result.description && (
        <p className="mt-1 text-sm text-slate-500">{result.description}</p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <Field label="Org" value={result.organization} />
        <Field label="Location" value={result.location} />
        <Field label="Value" value={result.value} />
        <Field label="Qty" value={result.quantity} />
        <Field label="Deadline" value={result.deadline} />
        <Field
          label="Contact"
          value={
            [result.contact_name, result.contact_phone, result.contact_email]
              .filter(Boolean)
              .join(" · ") || null
          }
        />
      </div>

      {(result.url || result.reference) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
          {result.reference && (
            <span className="text-xs text-slate-500">
              Ref:{" "}
              <span className="font-mono text-slate-700">
                {result.reference}
              </span>
            </span>
          )}
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              title="Opens the original tender on the source website"
            >
              🔗 View live listing on {domainOf(result.url)}
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {result.has_document && result.file_url && (
          <a
            href={result.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            title="Download the official tender document (PDF)"
          >
            ⬇ Download file (PDF)
          </a>
        )}

        {canEnrich && (
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            {streaming ? (
              <>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                Reading document &amp; summarizing…
              </>
            ) : open ? (
              <>
                Hide contract details <span className="text-xs">▲</span>
              </>
            ) : (
              <>
                ✦ View contract details <span className="text-xs">▼</span>
              </>
            )}
          </button>
        )}

        {!result.has_document && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
            No file available
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2">
          {streaming && !details && (
            <p className="text-sm text-slate-400">
              Fetching the tender PDF and streaming the contract brief…
            </p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {details && (
            <div>
              <ContractDetails cd={details} />
              {streaming && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-brand-500">
                  <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-brand-500" />
                  streaming…
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
