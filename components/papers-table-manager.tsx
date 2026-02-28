"use client";

import { useMemo, useRef, useState } from "react";

import {
  approveStagingPaper,
  extractPaper,
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
  const [approving, setApproving] = useState(false);
  const [extractingIndex, setExtractingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingSaveRow, setPendingSaveRow] = useState<PaperRow | null>(null);
  const saveInFlightRef = useRef(false);
  const approveInFlightRef = useRef(false);
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

  const extract = async (rowIndex: number) => {
    if (variant !== "papers") return;
    setExtractingIndex(rowIndex);
    setError("");

    try {
      await extractPaper(rows[rowIndex]);
      await load();
    } catch (extractError) {
      setError(
        extractError instanceof Error ? extractError.message : "Extract failed",
      );
    } finally {
      setExtractingIndex(null);
    }
  };

  return (
    <section className="grid gap-5">
      <header>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-[#a5a5a5]">{description}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)] p-4">
        <label className="grid gap-1 text-sm">
          <span className="text-[#a5a5a5]">Offset</span>
          <input
            type="number"
            min={0}
            value={offset}
            onChange={(event) => setOffset(Number(event.target.value))}
            className="w-28 rounded-lg border border-white/15 bg-[rgba(10,10,10,0.9)] px-2 py-1"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-[#a5a5a5]">Limit</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="w-28 rounded-lg border border-white/15 bg-[rgba(10,10,10,0.9)] px-2 py-1"
          />
        </label>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-5 py-2 text-sm font-semibold text-[#0b0b0b] disabled:opacity-70"
        >
          {loading ? "Loading..." : "Fetch"}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-300/30 bg-red-200/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2 font-semibold text-[#d8d8d8]"
                >
                  {column}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold text-[#d8d8d8]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={`${rowIndex}-${toCellText(row.id) || toCellText(row.idx)}`}
                className="border-b border-white/5 align-top"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="max-w-[280px] px-3 py-2 text-[#cfcfcf]"
                  >
                    <div className="line-clamp-4 break-words">
                      {toCellText(row[column])}
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-2">
                    {variant === "papers-staging" ? (
                      <button
                        type="button"
                        onClick={() => setApproveIndex(rowIndex)}
                        className="rounded-lg border border-emerald-300/35 px-2 py-1 text-xs font-semibold text-emerald-200 hover:border-emerald-200/60"
                      >
                        Approve
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openEditor(rowIndex)}
                      className="w-20 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-[#e5e5e5] hover:border-white/35"
                    >
                      Edit
                    </button>
                    {variant === "papers" ? (
                      <button
                        type="button"
                        onClick={() => extract(rowIndex)}
                        disabled={extractingIndex === rowIndex}
                        className="w-20 rounded-lg border border-sky-300/35 px-2 py-1 text-xs font-semibold text-sky-200 hover:border-sky-200/60 disabled:opacity-70"
                      >
                        {extractingIndex === rowIndex
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
                  className="px-3 py-5 text-center text-[#9a9a9a]"
                >
                  Click Fetch to load rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingIndex !== null ? (
        <div className="grid gap-3 rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)] p-4">
          <p className="text-sm font-semibold">Edit Allowed Fields</p>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">title</span>
            <input
              type="text"
              value={editForm.title}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">authors (one per line)</span>
            <textarea
              value={editForm.authorsText}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  authorsText: event.target.value,
                }))
              }
              className="min-h-28 rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] p-3 text-xs"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">journal</span>
            <input
              type="text"
              value={editForm.journal}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  journal: event.target.value,
                }))
              }
              className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">year</span>
            <input
              type="number"
              value={editForm.year}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, year: event.target.value }))
              }
              className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">abstract</span>
            <textarea
              value={editForm.abstract}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  abstract: event.target.value,
                }))
              }
              className="min-h-40 rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] p-3 text-xs"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">pdf_url</span>
            <input
              type="text"
              value={editForm.pdfUrl}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, pdfUrl: event.target.value }))
              }
              className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-[#a5a5a5]">ingestion_source</span>
            <input
              type="text"
              value={editForm.ingestionSource}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  ingestionSource: event.target.value,
                }))
              }
              className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-5 py-2 text-sm font-semibold text-[#0b0b0b]"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="rounded-full border border-white/20 px-5 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {approveIndex !== null ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[rgba(18,18,18,0.96)] p-5">
            <p className="text-sm text-[#e5e5e5]">
              Are you sure you want to approve this paper&apos;s bibliographic
              information?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={approve}
                disabled={approving}
                className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-5 py-2 text-sm font-semibold text-[#0b0b0b] disabled:opacity-70"
              >
                {approving ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setApproveIndex(null)}
                disabled={approving}
                className="rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSaveOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[rgba(18,18,18,0.96)] p-5">
            <p className="text-sm text-[#e5e5e5]">Approve the edited data?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-5 py-2 text-sm font-semibold text-[#0b0b0b] disabled:opacity-70"
              >
                {saving ? "Saving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={cancelSaveConfirm}
                disabled={saving}
                className="rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-70"
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
