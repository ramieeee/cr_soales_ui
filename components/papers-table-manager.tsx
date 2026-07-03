"use client";

import { useMemo, useRef, useState } from "react";

import { useExtractionSession } from "@/components/extraction-session";
import { LoadingSignal } from "@/components/loading-signal";
import {
  approveStagingPaper,
  fetchPapers,
  fetchStagingPapers,
  type PaperRow,
  updatePaper,
  updateStagingPaper,
} from "@/lib/paper-review-api";

type TableManagerProps = {
  variant: "papers" | "papers-staging";
  title: string;
  description: string;
};

const VISIBLE_KEYS = [
  "title",
  "authors",
  "journal",
  "year",
  "abstract",
  "pdf_url",
  "ingestion_source",
] as const;

type EditForm = {
  title: string;
  authorsText: string;
  journal: string;
  year: string;
  abstract: string;
  pdfUrl: string;
  ingestionSource: string;
};

const toCellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const isAlreadyApprovedError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("already approved");
};

const toEditForm = (row: PaperRow): EditForm => {
  const authors =
    Array.isArray(row.authors) &&
    row.authors.every((item) => typeof item === "string")
      ? (row.authors as string[])
      : [];

  return {
    title: typeof row.title === "string" ? row.title : "",
    authorsText: authors.join("\n"),
    journal: typeof row.journal === "string" ? row.journal : "",
    year:
      row.year === null || row.year === undefined
        ? ""
        : typeof row.year === "number"
          ? String(row.year)
          : String(row.year),
    abstract: typeof row.abstract === "string" ? row.abstract : "",
    pdfUrl: typeof row.pdf_url === "string" ? row.pdf_url : "",
    ingestionSource:
      typeof row.ingestion_source === "string" ? row.ingestion_source : "",
  };
};

export default function PapersTableManager({
  variant,
  title,
  description,
}: TableManagerProps) {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState<PaperRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [approveIndex, setApproveIndex] = useState<number | null>(null);
  const [extractIndex, setExtractIndex] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingSaveRow, setPendingSaveRow] = useState<PaperRow | null>(null);
  const saveInFlightRef = useRef(false);
  const approveInFlightRef = useRef(false);
  const { startExtraction, sessions, revealSessionByPaperId } =
    useExtractionSession();
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    authorsText: "",
    journal: "",
    year: "",
    abstract: "",
    pdfUrl: "",
    ingestionSource: "",
  });

  const columns = useMemo(() => Array.from(VISIBLE_KEYS), []);

  const extractingPaperIds = useMemo(
    () =>
      new Set(
        sessions
          .filter((session) => session.status === "extracting")
          .map((session) => session.paperId),
      ),
    [sessions],
  );

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const fetchRows =
        variant === "papers-staging" ? fetchStagingPapers : fetchPapers;
      const payload = await fetchRows(offset, limit);
      setRows(payload);
      setEditingIndex(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to fetch",
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (index: number) => {
    setEditingIndex(index);
    setEditForm(toEditForm(rows[index]));
  };

  const executeSave = async (row: PaperRow) => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const updateRow =
        variant === "papers-staging" ? updateStagingPaper : updatePaper;
      await updateRow(row);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Update failed",
      );
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  const save = async () => {
    if (editingIndex === null) return;

    const source = rows[editingIndex];
    const nextRow: PaperRow = {
      ...source,
      title: editForm.title,
      authors: editForm.authorsText
        .split("\n")
        .map((author) => author.trim())
        .filter(Boolean),
      journal: editForm.journal,
      year: editForm.year.trim() ? Number(editForm.year) : null,
      abstract: editForm.abstract,
      pdf_url: editForm.pdfUrl.trim() || null,
      ingestion_source: editForm.ingestionSource,
    };

    setPendingSaveRow(nextRow);
    setConfirmSaveOpen(true);
  };

  const confirmSave = async () => {
    if (!pendingSaveRow) return;
    await executeSave(pendingSaveRow);
    setConfirmSaveOpen(false);
    setPendingSaveRow(null);
  };

  const cancelSaveConfirm = () => {
    setConfirmSaveOpen(false);
    setPendingSaveRow(null);
  };

  const approve = async () => {
    if (approveIndex === null || variant !== "papers-staging") return;
    if (approveInFlightRef.current) return;
    approveInFlightRef.current = true;

    setApproving(true);
    try {
      try {
        await approveStagingPaper(rows[approveIndex]);
      } catch (approveError) {
        if (!isAlreadyApprovedError(approveError)) {
          throw approveError;
        }
      }
      setApproveIndex(null);
      await load();
    } catch (approveError) {
      setError(
        approveError instanceof Error ? approveError.message : "Approve failed",
      );
    } finally {
      approveInFlightRef.current = false;
      setApproving(false);
    }
  };

  const resolvePaperId = (row: PaperRow) => {
    const candidates = [row.paper_id, row.id, row.idx, row.uuid, row._id];
    const value = candidates.find(
      (item) => item !== undefined && item !== null && item !== "",
    );

    return value === undefined ? "" : String(value);
  };

  const openExtractConfirm = (rowIndex: number) => {
    const paperId = resolvePaperId(rows[rowIndex]);

    if (extractingPaperIds.has(paperId)) {
      revealSessionByPaperId(paperId);
      return;
    }

    setExtractIndex(rowIndex);
  };

  const confirmExtract = async () => {
    if (extractIndex === null || variant !== "papers") return;

    const row = rows[extractIndex];
    const paperTitle = typeof row.title === "string" ? row.title : "";
    setExtractIndex(null);

    try {
      void startExtraction({ row, paperTitle });
    } catch (extractError) {
      setError(
        extractError instanceof Error ? extractError.message : "Extract failed",
      );
    }
  };

  return (
    <section className="grid gap-6">
      {loading ? (
        <LoadingSignal
          label="Fetching Records"
          detail="Loading paper nodes from the review API..."
        />
      ) : null}

      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="soales-mono uppercase text-[#ccc3d8]/80">
            {variant === "papers-staging" ? "Review Queue" : "Client Dataset"}
          </p>
          <h1 className="soales-subheading mt-3 text-3xl tracking-[-0.02em] text-[#dae2fd] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#ccc3d8] md:text-base">
            {description}
          </p>
        </div>
        <div className="soales-panel px-5 py-4">
          <p className="soales-subheading text-3xl text-[#dae2fd]">{rows.length}</p>
          <p className="soales-mono mt-2 text-[10px] uppercase text-[#ccc3d8]">
            Loaded Rows
          </p>
        </div>
      </header>

      <div className="soales-panel flex flex-wrap items-end gap-4 p-4">
        <label className="grid gap-1 text-sm">
          <span className="soales-mono text-[#ccc3d8]">Offset</span>
          <input
            type="number"
            min={0}
            value={offset}
            onChange={(event) => setOffset(Number(event.target.value))}
            className="soales-input w-28"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="soales-mono text-[#ccc3d8]">Limit</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="soales-input w-28"
          />
        </label>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="soales-button-primary disabled:opacity-70"
        >
          {loading ? "Loading..." : "Fetch"}
        </button>
      </div>

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
                <th key={column}>
                  {column}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${rowIndex}-${toCellText(row.id) || toCellText(row.idx)}`}
              >
                {columns.map((column) => (
                  <td key={column} className="max-w-[280px]">
                    <div className="line-clamp-4 break-words">
                      {toCellText(row[column])}
                    </div>
                  </td>
                ))}
                <td>
                  <div className="flex flex-col gap-2">
                    {variant === "papers-staging" ? (
                      <button
                        type="button"
                        onClick={() => setApproveIndex(rowIndex)}
                        className="rounded border border-[#38bdf8]/35 px-2 py-1 text-xs font-semibold text-[#93c5fd] transition-colors duration-150 ease-out hover:border-[#93c5fd]/70"
                      >
                        Approve
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openEditor(rowIndex)}
                      className="w-20 rounded border border-[#475569]/70 px-2 py-1 text-xs font-semibold text-[#e5e7eb] transition-colors duration-150 ease-out hover:border-[#93c5fd]"
                    >
                      Edit
                    </button>
                    {variant === "papers" ? (
                      <button
                        type="button"
                        onClick={() => openExtractConfirm(rowIndex)}
                        disabled={extractingPaperIds.has(resolvePaperId(row))}
                        className="w-20 rounded border border-[#93c5fd]/35 px-2 py-1 text-xs font-semibold text-[#93c5fd] transition-colors duration-150 ease-out hover:border-[#93c5fd]/70 disabled:opacity-70"
                      >
                        {extractingPaperIds.has(resolvePaperId(row))
                          ? "Extracting..."
                          : "Extract"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length + 1, 2)}
                  className="px-3 py-5 text-center text-[#ccc3d8]"
                >
                  Click Fetch to load rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingIndex !== null ? (
        <div className="soales-panel ui-pop grid gap-5 p-5">
          <p className="soales-mono uppercase text-[#93c5fd]">Edit Allowed Fields</p>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">title</span>
            <input
              type="text"
              value={editForm.title}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="soales-input"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">authors (one per line)</span>
            <textarea
              value={editForm.authorsText}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  authorsText: event.target.value,
                }))
              }
              className="soales-input min-h-28 text-xs"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">journal</span>
            <input
              type="text"
              value={editForm.journal}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  journal: event.target.value,
                }))
              }
              className="soales-input"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">year</span>
            <input
              type="number"
              value={editForm.year}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, year: event.target.value }))
              }
              className="soales-input"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">abstract</span>
            <textarea
              value={editForm.abstract}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  abstract: event.target.value,
                }))
              }
              className="soales-input min-h-40 text-xs"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">pdf_url</span>
            <input
              type="text"
              value={editForm.pdfUrl}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, pdfUrl: event.target.value }))
              }
              className="soales-input"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#ccc3d8]">ingestion_source</span>
            <input
              type="text"
              value={editForm.ingestionSource}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  ingestionSource: event.target.value,
                }))
              }
              className="soales-input"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="soales-button-primary disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="soales-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {approveIndex !== null ? (
        <div className="ui-fade-in fixed inset-0 z-40 grid place-items-center bg-[#060e20]/70 px-4 backdrop-blur-xl">
          <div className="soales-panel ui-pop w-full max-w-md p-5">
            <p className="text-sm text-[#dae2fd]">
              Are you sure you want to approve this paper&apos;s bibliographic
              information?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={approve}
                disabled={approving}
                className="soales-button-primary disabled:opacity-70"
              >
                {approving ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setApproveIndex(null)}
                disabled={approving}
                className="soales-button-secondary disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSaveOpen ? (
        <div className="ui-fade-in fixed inset-0 z-40 grid place-items-center bg-[#060e20]/70 px-4 backdrop-blur-xl">
          <div className="soales-panel ui-pop w-full max-w-md p-5">
            <p className="text-sm text-[#dae2fd]">Approve the edited data?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="soales-button-primary disabled:opacity-70"
              >
                {saving ? "Saving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={cancelSaveConfirm}
                disabled={saving}
                className="soales-button-secondary disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {extractIndex !== null ? (
        <div className="ui-fade-in fixed inset-0 z-40 grid place-items-center bg-[#060e20]/70 px-4 backdrop-blur-xl">
          <div className="soales-panel ui-pop w-full max-w-md p-5">
            <p className="text-sm text-[#dae2fd]">
              Extract data from the paper?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={confirmExtract}
                className="soales-button-primary"
              >
                Extract
              </button>
              <button
                type="button"
                onClick={() => setExtractIndex(null)}
                className="soales-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
