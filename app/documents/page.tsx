"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import {
  api,
  DocumentStorage,
  StoredDocument,
  downloadStoredDocument,
  uploadDocument,
} from "@/lib/api";

const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: "registration", label: "Registration", hint: "GST, PAN, incorporation, Udyam/MSE" },
  { value: "financial", label: "Financial", hint: "Turnover certificates, ITRs, bank details" },
  { value: "certification", label: "Certifications", hint: "ISO, BIS, quality certificates" },
  { value: "experience", label: "Experience", hint: "Past POs, completion certificates" },
  { value: "technical", label: "Technical", hint: "Datasheets, brochures, spec sheets" },
  { value: "other", label: "Other", hint: "Anything else" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(doc: StoredDocument): string {
  const t = doc.content_type;
  if (t.includes("pdf")) return "📄";
  if (t.startsWith("image/")) return "🖼️";
  if (t.includes("sheet") || t.includes("excel") || t.includes("csv")) return "📊";
  if (t.includes("word") || t.includes("document")) return "📝";
  return "📎";
}

export default function DocumentsPage() {
  const [storage, setStorage] = useState<DocumentStorage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editNotes, setEditNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setStorage(await api.documents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        await uploadDocument(file, { category: uploadCategory });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function startEdit(doc: StoredDocument) {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditNotes(doc.notes ?? "");
  }

  async function saveEdit(id: number) {
    try {
      await api.updateDocument(id, {
        name: editName.trim() || undefined,
        category: editCategory,
        notes: editNotes,
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(doc: StoredDocument) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteDocument(doc.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const docs = storage?.documents ?? [];
  const grouped = CATEGORIES.map((c) => ({
    ...c,
    docs: docs.filter((d) => d.category === c.value),
  })).filter((g) => g.docs.length > 0);
  const usedPct = storage && storage.quota_bytes > 0
    ? Math.min(100, (storage.used_bytes / storage.quota_bytes) * 100)
    : 0;

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Documents
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Your document locker — keep GST, PAN, certificates, and past POs on
          file so every application can reuse them.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mb-6 rounded-xl border-2 border-dashed bg-white p-6 text-center transition ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600">
          Drag &amp; drop files here, or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-semibold text-brand-600 hover:underline disabled:opacity-50"
          >
            browse
          </button>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-slate-400">Save into:</span>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {uploading && (
          <p className="mt-2 text-sm font-medium text-brand-600">Uploading…</p>
        )}
        {storage && (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {formatBytes(storage.used_bytes)} of{" "}
              {formatBytes(storage.quota_bytes)} used · max{" "}
              {formatBytes(storage.max_file_bytes)} per file
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-slate-600">No documents stored yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Upload the documents you attach to every bid — GST certificate,
            PAN, Udyam/MSE certificate, ISO certs, past purchase orders.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.value}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </h2>
                <span className="text-xs text-slate-400">{group.hint}</span>
              </div>
              <div className="space-y-2">
                {group.docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    {editingId === doc.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                            placeholder="Document name"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                          placeholder="Notes (validity, issuing body, …)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(doc.id)}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-2xl">{fileIcon(doc)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {doc.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {doc.filename} · {formatBytes(doc.size_bytes)} ·
                              added{" "}
                              {new Date(doc.created_at).toLocaleDateString()}
                              {doc.notes ? ` · ${doc.notes}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-sm">
                          <button
                            onClick={() =>
                              downloadStoredDocument(doc).catch((e) =>
                                setError(
                                  e instanceof Error ? e.message : String(e),
                                ),
                              )
                            }
                            className="font-medium text-brand-600 hover:underline"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => startEdit(doc)}
                            className="font-medium text-slate-500 hover:text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(doc)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
