export type PaperRow = Record<string, unknown>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost";
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8000";
const PAPER_REVIEW_PREFIX = process.env.NEXT_PUBLIC_PAPER_REVIEW_PREFIX ?? "/paper_review";

const UPLOAD_PATH =
  process.env.NEXT_PUBLIC_UPLOAD_PATH ??
  process.env.NEXT_PUBLIC_PROCESS_PATH ??
  `${PAPER_REVIEW_PREFIX}/upload_pdf`;

const FETCH_STAGING_PATH =
  process.env.NEXT_PUBLIC_FETCH_STAGING_PATH ??
  `${PAPER_REVIEW_PREFIX}/fetch/staging_papers`;

const FETCH_PAPERS_PATH =
  process.env.NEXT_PUBLIC_FETCH_PAPERS_PATH ??
  `${PAPER_REVIEW_PREFIX}/fetch/papers`;

const UPDATE_STAGING_PATH =
  process.env.NEXT_PUBLIC_UPDATE_STAGING_PATH ??
  `${PAPER_REVIEW_PREFIX}/update/staging_paper`;

const UPDATE_PAPERS_PATH =
  process.env.NEXT_PUBLIC_UPDATE_PAPERS_PATH ??
  `${PAPER_REVIEW_PREFIX}/update/paper`;

const buildUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}:${API_PORT}${normalized}`;
};

const postForm = async (path: string, fields: Record<string, string | number | Blob>) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, value);
  });

  const response = await fetch(buildUrl(path), {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
};

const toRows = (payload: unknown): PaperRow[] => {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is PaperRow => typeof row === "object" && row !== null);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    const candidates = [objectPayload.items, objectPayload.results, objectPayload.data];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (row): row is PaperRow => typeof row === "object" && row !== null,
        );
      }
    }
  }

  return [];
};

export const uploadDocument = async (params: {
  pdf: File;
  prompt: string;
  ingestionSource: string;
}) => {
  return postForm(UPLOAD_PATH, {
    pdf: params.pdf,
    prompt: params.prompt,
    ingestion_source: params.ingestionSource,
  });
};

export const fetchStagingPapers = async (offset: number, limit: number) => {
  const payload = await postForm(FETCH_STAGING_PATH, { offset, limit });
  return toRows(payload);
};

export const fetchPapers = async (offset: number, limit: number) => {
  const payload = await postForm(FETCH_PAPERS_PATH, { offset, limit });
  return toRows(payload);
};

const resolveId = (row: PaperRow) => {
  const candidates = [row.id, row.paper_id, row.staging_id, row.uuid, row._id];
  const value = candidates.find((item) => item !== undefined && item !== null && item !== "");
  return value ? String(value) : "";
};

export const updateStagingPaper = async (row: PaperRow) => {
  const id = resolveId(row);
  return postForm(UPDATE_STAGING_PATH, {
    id,
    payload: JSON.stringify(row),
  });
};

export const updatePaper = async (row: PaperRow) => {
  const id = resolveId(row);
  return postForm(UPDATE_PAPERS_PATH, {
    id,
    payload: JSON.stringify(row),
  });
};
