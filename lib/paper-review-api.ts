export type PaperRow = Record<string, unknown>;
export type ReviewTableType = "papers_staging" | "papers";
const EDITABLE_KEYS = [
  "title",
  "authors",
  "journal",
  "year",
  "abstract",
  "pdf_url",
  "ingestion_source",
] as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost";
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8000";
const PAPER_REVIEW_PREFIX =
  process.env.NEXT_PUBLIC_PAPER_REVIEW_PREFIX ?? "/paper_review";

const UPLOAD_PATH =
  process.env.NEXT_PUBLIC_UPLOAD_PATH ??
  process.env.NEXT_PUBLIC_PROCESS_PATH ??
  `${PAPER_REVIEW_PREFIX}/upload_pdf`;

const FETCH_PAPERS_PATH =
  process.env.NEXT_PUBLIC_FETCH_PAPERS_PATH ??
  `${PAPER_REVIEW_PREFIX}/fetch/papers`;

const UPDATE_STAGING_PATH =
  process.env.NEXT_PUBLIC_UPDATE_STAGING_PATH ??
  `${PAPER_REVIEW_PREFIX}/update/paper_staging`;

const UPDATE_PAPERS_PATH =
  process.env.NEXT_PUBLIC_UPDATE_PAPERS_PATH ??
  `${PAPER_REVIEW_PREFIX}/update/paper`;

const APPROVE_STAGING_PATH =
  process.env.NEXT_PUBLIC_APPROVE_STAGING_PATH ??
  `${PAPER_REVIEW_PREFIX}/approve/paper_staging`;

const buildUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}:${API_PORT}${normalized}`;
};

const getWithQuery = async (
  path: string,
  query: Record<string, string | number>,
) => {
  const url = new URL(buildUrl(path));
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
};

const postForm = async (
  path: string,
  fields: Record<string, string | number | Blob>,
) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, value instanceof Blob ? value : String(value));
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

const postWithQuery = async (
  path: string,
  query: Record<string, string | number>,
) => {
  const url = new URL(buildUrl(path));
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
};

const postJsonWithQuery = async (
  path: string,
  query: Record<string, string | number>,
  body: unknown,
) => {
  const url = new URL(buildUrl(path));
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    return payload.filter(
      (row): row is PaperRow => typeof row === "object" && row !== null,
    );
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    const candidates = [
      objectPayload.items,
      objectPayload.results,
      objectPayload.data,
    ];

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
  const payload = await getWithQuery(FETCH_PAPERS_PATH, {
    offset,
    limit,
    table_type: "papers_staging",
  });
  return toRows(payload);
};

export const fetchPapers = async (offset: number, limit: number) => {
  const payload = await getWithQuery(FETCH_PAPERS_PATH, {
    offset,
    limit,
    table_type: "papers",
  });
  return toRows(payload);
};

const resolveId = (row: PaperRow) => {
  const candidates = [
    row.id,
    row.paper_id,
    row.staging_id,
    row.idx,
    row.uuid,
    row._id,
  ];
  const value = candidates.find(
    (item) => item !== undefined && item !== null && item !== "",
  );
  return value ? String(value) : "";
};

const sanitizeEditablePayload = (row: PaperRow): PaperRow => {
  const payload: PaperRow = {};
  EDITABLE_KEYS.forEach((key) => {
    payload[key] = row[key];
  });
  return payload;
};

export const updateStagingPaper = async (row: PaperRow) => {
  const id = resolveId(row);
  const payload = sanitizeEditablePayload(row);
  return postJsonWithQuery(UPDATE_STAGING_PATH, { id }, payload);
};

export const updatePaper = async (row: PaperRow) => {
  const id = resolveId(row);
  const payload = sanitizeEditablePayload(row);
  return postWithQuery(UPDATE_PAPERS_PATH, {
    id,
    payload: JSON.stringify(payload),
  });
};

const resolveStagingApproveId = (row: PaperRow) => {
  const candidates = [row.idx, row.staging_idx, row.staging_id];
  const numeric = candidates.find((item) => {
    if (item === null || item === undefined || item === "") return false;
    return Number.isInteger(Number(item));
  });

  if (numeric === undefined) {
    throw new Error("Missing numeric idx for staging approval");
  }

  return String(numeric);
};

export const approveStagingPaper = async (row: PaperRow) => {
  const id = resolveStagingApproveId(row);
  return postWithQuery(APPROVE_STAGING_PATH, { id });
};
