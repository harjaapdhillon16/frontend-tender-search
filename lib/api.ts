// API client for the Tender Search client app (auth-aware).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TOKEN_KEY = "ts_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function parseError(text: string): string {
  try {
    const j = JSON.parse(text);
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail) && j.detail[0]?.msg) return j.detail[0].msg;
  } catch {
    /* ignore */
  }
  return text || "Request failed";
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: authHeaders(opts.headers as Record<string, string>),
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(parseError(await res.text()));
  if (res.status === 204) return null as T;
  return res.json();
}

// ------------------------------------------------------------------- types
export interface SellerProfile {
  company_name?: string;
  gst?: string;
  pan?: string;
  experience_years?: number | string;
  certifications?: string;
  capabilities?: string;
  is_mse?: boolean;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  notes?: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_active: boolean;
  refresh_hours: number;
  seller_profile: SellerProfile;
  created_at: string;
  last_login_at: string | null;
}

export interface ApplicationDraft {
  cover_letter?: string;
  technical_compliance?: { requirement: string; response: string }[];
  eligibility_response?: { criterion: string; statement: string }[];
  pricing_note?: string;
  document_checklist?: string[];
  emd_note?: string;
  risks_or_gaps?: string[];
  summary?: string;
}

export interface Application {
  id: number;
  result_id: number;
  tender_title: string;
  tender_reference: string | null;
  tender_url: string | null;
  status: string;
  inputs: Record<string, unknown>;
  draft: ApplicationDraft;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  required: boolean;
  prefill?: string | null;
  placeholder?: string | null;
  help?: string | null;
}

export interface RequiredDocument {
  id: string;
  title: string;
  category: "generate" | "upload";
  why?: string;
  fields?: RequiredDocField[];
  upload_hint?: string;
}

export interface Keyword {
  id: number;
  term: string;
  active: boolean;
  created_at: string;
  last_run_at: string | null;
  result_count: number;
}

export interface Result {
  id: number;
  run_id: number | null;
  keyword_id: number | null;
  search_term: string;
  source: string;
  record_type: string;
  title: string;
  description: string | null;
  organization: string | null;
  location: string | null;
  value: string | null;
  value_numeric: number | null;
  quantity: string | null;
  deadline: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  url: string | null;
  file_url: string | null;
  reference: string | null;
  relevance_score: number | null;
  deadline_at: string | null;
  cleaned_by_llm: boolean;
  has_document: boolean;
  enriched: boolean;
  scraped_at: string;
}

export interface ContractDetails {
  about?: string | null;
  scope_of_work?: string | null;
  key_requirements?: string[] | null;
  eligibility?: string[] | null;
  estimated_value?: string | null;
  emd?: string | null;
  min_turnover?: string | null;
  delivery_period?: string | null;
  delivery_location?: string | null;
  key_dates?: Record<string, string | null> | null;
  documents_required?: string[] | null;
  mse_startup_exemption?: string | null;
  contact?: string | null;
  note?: string | null;
}

export interface ResultDetail extends Result {
  document_url: string | null;
  contract_details: ContractDetails;
  enriched_at: string | null;
}

export interface Stats {
  total_results: number;
  with_document: number;
  enriched: number;
}

export interface StoredDocument {
  id: number;
  name: string;
  category: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentStorage {
  documents: StoredDocument[];
  used_bytes: number;
  quota_bytes: number;
  max_file_bytes: number;
}

// ----------------------------------------------------------------- endpoints
export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<User>("/api/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    req<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  keywords: () => req<Keyword[]>("/api/keywords"),
  addKeyword: (term: string) =>
    req<Keyword>("/api/keywords", { method: "POST", body: JSON.stringify({ term }) }),
  updateKeyword: (id: number, patch: { term?: string; active?: boolean }) =>
    req<Keyword>(`/api/keywords/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteKeyword: (id: number) =>
    req<{ ok: boolean }>(`/api/keywords/${id}`, { method: "DELETE" }),

  getSettings: () => req<User>("/api/settings"),
  updateSettings: (patch: {
    name?: string;
    refresh_hours?: number;
    seller_profile?: SellerProfile;
  }) => req<User>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),

  applications: () => req<Application[]>("/api/applications"),
  getApplicationForResult: (resultId: number) =>
    req<Application>(`/api/results/${resultId}/application`),
  requiredDocuments: (appId: number, refresh = false) =>
    req<{ documents: RequiredDocument[] }>(
      `/api/applications/${appId}/required-documents${refresh ? "?refresh=true" : ""}`,
      { method: "POST" },
    ),
  updateApplication: (id: number, patch: Partial<Application>) =>
    req<Application>(`/api/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteApplication: (id: number) =>
    req<{ ok: boolean }>(`/api/applications/${id}`, { method: "DELETE" }),

  results: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const q = qs.toString();
    return req<Result[]>(`/api/results${q ? `?${q}` : ""}`);
  },
  stats: () => req<Stats>("/api/stats"),
  enrich: (id: number) =>
    req<ResultDetail>(`/api/results/${id}/enrich`, { method: "POST" }),

  documents: () => req<DocumentStorage>("/api/documents"),
  updateDocument: (
    id: number,
    patch: { name?: string; category?: string; notes?: string },
  ) =>
    req<StoredDocument>(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteDocument: (id: number) =>
    req<{ ok: boolean }>(`/api/documents/${id}`, { method: "DELETE" }),
};

// Upload one document (multipart — the browser sets the Content-Type boundary).
export async function uploadDocument(
  file: File,
  meta: { name?: string; category?: string; notes?: string } = {},
): Promise<StoredDocument> {
  const form = new FormData();
  form.append("file", file);
  if (meta.name) form.append("name", meta.name);
  if (meta.category) form.append("category", meta.category);
  if (meta.notes) form.append("notes", meta.notes);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers,
    body: form,
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(parseError(await res.text()));
  return res.json();
}

// Download a stored document with its original filename.
export function downloadStoredDocument(doc: StoredDocument): Promise<void> {
  return downloadAuthed(`/api/documents/${doc.id}/download`, doc.filename);
}

// ------------------------------------------------------ streaming enrichment
export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone: (result: ResultDetail) => void;
  onError: (message: string) => void;
}

export async function enrichStream(id: number, handlers: StreamHandlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/results/${id}/enrich/stream`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch (e) {
    handlers.onError(String(e));
    return;
  }
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") location.href = "/login";
    return;
  }
  if (!res.ok || !res.body) {
    handlers.onError(`${res.status} ${res.statusText}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const evt = parseSseBlock(block);
      if (!evt) continue;
      if (evt.event === "delta") handlers.onDelta(evt.data as string);
      else if (evt.event === "done") handlers.onDone(evt.data as ResultDetail);
      else if (evt.event === "error") handlers.onError(String(evt.data));
    }
  }
}

function parseSseBlock(block: string): { event: string; data: unknown } | null {
  let event = "message";
  let dataRaw = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
  }
  if (!dataRaw) return null;
  try {
    return { event, data: JSON.parse(dataRaw) };
  } catch {
    return { event, data: dataRaw };
  }
}

// ------------------------------------------------ application draft streaming
export interface DraftHandlers {
  onDelta: (text: string) => void;
  onDone: (application: Application) => void;
  onError: (message: string) => void;
}

export async function draftApplicationStream(
  resultId: number,
  inputs: Record<string, unknown>,
  handlers: DraftHandlers,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/results/${resultId}/application/draft/stream`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify({ inputs }) },
    );
  } catch (e) {
    handlers.onError(String(e));
    return;
  }
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") location.href = "/login";
    return;
  }
  if (!res.ok || !res.body) {
    handlers.onError(`${res.status} ${res.statusText}`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const evt = parseSseBlock(block);
      if (!evt) continue;
      if (evt.event === "delta") handlers.onDelta(evt.data as string);
      else if (evt.event === "done") handlers.onDone(evt.data as Application);
      else if (evt.event === "error") handlers.onError(String(evt.data));
    }
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadAuthed(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(parseError(await res.text()));
  saveBlob(await res.blob(), filename);
}

async function downloadAuthedPost(
  path: string,
  body: unknown,
  filename: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  saveBlob(await res.blob(), filename);
}

// Generate + download one required document as a filled PDF.
export function downloadDocumentPdf(
  appId: number,
  docId: string,
  answers: Record<string, string>,
): Promise<void> {
  return downloadAuthedPost(
    `/api/applications/${appId}/documents/${docId}/pdf`,
    { answers },
    `${docId}_${appId}.pdf`,
  );
}

// Download the drafted application as a readable text document.
export function downloadApplicationDoc(appId: number): Promise<void> {
  return downloadAuthed(
    `/api/applications/${appId}/document`,
    `application_${appId}.txt`,
  );
}

// Download the optional local browser-automation companion (advanced).
export function downloadApplyCompanion(appId: number): Promise<void> {
  return downloadAuthed(
    `/api/applications/${appId}/apply-script`,
    `gem_apply_${appId}.py`,
  );
}
