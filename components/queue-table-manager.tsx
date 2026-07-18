"use client";

import { useEffect, useMemo, useState } from "react";

import { LoadingSignal } from "@/components/loading-signal";
import { fetchJob, fetchJobs, type JobRow } from "@/lib/paper-review-api";

type QueueTableManagerProps = {
  title: string;
  description: string;
};

const PAGE_SIZE_OPTIONS = [30, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const VISIBLE_KEYS = [
  "status",
  "job_type",
  "paper_id",
  "retry_count",
  "claimed_by",
  "created_at",
  "updated_at",
] as const;

const DETAIL_KEYS = [
  "id",
  "job_type",
  "paper_id",
  "run_id",
  "status",
  "priority",
  "retry_count",
  "max_retries",
  "claimed_by",
  "claimed_at",
  "scheduled_for",
  "created_at",
  "updated_at",
  "last_error",
  "payload_json",
] as const;

const toCellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const toDetailText = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
};

const resolveJobId = (row: JobRow) => {
  const candidates = [row.id, row.job_id];
  const value = candidates.find(
    (item) => item !== undefined && item !== null && item !== "",
  );
  return value === undefined ? "" : String(value);
};

export default function QueueTableManager({
  title,
  description,
}: QueueTableManagerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(30);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const columns = useMemo(() => Array.from(VISIBLE_KEYS), []);

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    setError("");

    try {
      const offset = (nextPage - 1) * nextPageSize;
      const payload = await fetchJobs(offset, nextPageSize);
      setRows(payload);
      setHasNextPage(payload.length === nextPageSize);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to fetch",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const onPageSizeChange = (value: PageSize) => {
    setPageSize(value);
    setPage(1);
  };

  const openDetail = async (row: JobRow) => {
    const jobId = resolveJobId(row);
    if (!jobId) {
      setSelectedJob(row);
      return;
    }

    setDetailLoading(true);
    setSelectedJob(row);
    try {
      const detail = await fetchJob(jobId);
      setSelectedJob(detail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load job detail",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = (page - 1) * pageSize + rows.length;

  return (
    <section className="grid gap-6">
      {loading ? (
        <LoadingSignal
          label="Fetching Queue"
          detail="Loading job_queue rows from the API..."
        />
      ) : null}

      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="soales-subheading mt-3 text-3xl tracking-[-0.02em] text-[#dae2fd] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#ccc3d8] md:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="soales-mono text-[10px] uppercase text-[#ccc3d8]">
              Refresh
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="soales-input inline-flex h-[2.75rem] w-28 cursor-pointer items-center justify-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base leading-none">
                refresh
              </span>
              <span className="soales-mono text-xs uppercase tracking-widest">
                Sync
              </span>
            </button>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="soales-mono text-[10px] uppercase text-[#ccc3d8]">
              Rows per page
            </span>
            <select
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value) as PageSize)
              }
              disabled={loading}
              className="soales-input h-[2.75rem] w-28 cursor-pointer appearance-none disabled:opacity-70"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="soales-panel px-5 py-4">
            <p className="soales-subheading text-3xl text-[#dae2fd]">
              {rows.length}
            </p>
            <p className="soales-mono mt-2 text-[10px] uppercase text-[#ccc3d8]">
              Loaded Rows
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <p className="ui-fade-in rounded bg-[#93000a]/20 px-3 py-2 text-sm text-[#ffdad6]">
          {error}
        </p>
      ) : null}

      <div className="soales-panel overflow-x-auto">
        <table className="soales-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${resolveJobId(row) || rowIndex}`}
                onClick={() => void openDetail(row)}
                className="cursor-pointer transition-colors duration-150 hover:bg-[#1f2937]/55"
              >
                {columns.map((column) => (
                  <td key={column}>
                    <div className="soales-table-cell" title={toCellText(row[column])}>
                      {toCellText(row[column])}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {!loading && !rows.length ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-3 py-5 text-center text-[#ccc3d8]"
                >
                  No jobs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="soales-mono text-[10px] uppercase tracking-widest text-[#ccc3d8]">
          {rows.length ? `Showing ${rangeStart}–${rangeEnd}` : "No rows"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={loading || page <= 1}
            className="soales-button-secondary disabled:opacity-40"
          >
            Previous
          </button>
          <span className="soales-mono min-w-20 px-2 text-center text-xs uppercase text-[#93c5fd]">
            Page {page}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || !hasNextPage}
            className="soales-button-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selectedJob ? (
        <div
          className="ui-fade-in fixed inset-0 z-40 grid place-items-center bg-[#060e20]/25 px-4 backdrop-blur-[2px]"
          onClick={() => setSelectedJob(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSelectedJob(null);
          }}
          role="presentation"
        >
          <div
            className="soales-panel ui-pop max-h-[85dvh] w-full max-w-2xl overflow-y-auto p-5"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Job detail"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="soales-mono uppercase text-[#93c5fd]">
                  Job Detail
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[#dae2fd]">
                  {resolveJobId(selectedJob) || "unknown"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="soales-button-secondary"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-[#ccc3d8]">Loading detail...</p>
            ) : (
              <dl className="grid gap-4">
                {DETAIL_KEYS.map((key) => (
                  <div key={key} className="grid gap-1">
                    <dt className="soales-mono text-[10px] uppercase tracking-widest text-[#93c5fd]">
                      {key}
                    </dt>
                    <dd>
                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-[#0b1220] p-3 font-mono text-xs leading-5 text-[#dae2fd]">
                        {toDetailText(selectedJob[key])}
                      </pre>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
