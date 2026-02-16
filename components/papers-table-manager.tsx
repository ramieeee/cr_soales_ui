"use client";

import { useMemo, useState } from "react";

import {
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

const cellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
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
  const [editText, setEditText] = useState("");

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 20).forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [rows]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const fetchRows =
        variant === "papers-staging" ? fetchStagingPapers : fetchPapers;
      const payload = await fetchRows(offset, limit);
      setRows(payload);
      setEditingIndex(null);
      setEditText("");
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
    setEditText(JSON.stringify(rows[index], null, 2));
  };

  const save = async () => {
    if (editingIndex === null) return;

    try {
      const updateRow =
        variant === "papers-staging" ? updateStagingPaper : updatePaper;
      const parsed = JSON.parse(editText) as PaperRow;
      await updateRow(parsed);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "수정 실패");
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
            max={200}
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
                key={`${rowIndex}-${cellText(row.id)}`}
                className="border-b border-white/5 align-top"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="max-w-[260px] px-3 py-2 text-[#cfcfcf]"
                  >
                    <div className="line-clamp-3 break-words">
                      {cellText(row[column])}
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditor(rowIndex)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-[#e5e5e5] hover:border-white/35"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length + 1, 2)}
                  className="px-3 py-5 text-center text-[#9a9a9a]"
                >
                  Fetch를 눌러 데이터를 불러오세요.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingIndex !== null ? (
        <div className="grid gap-3 rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)] p-4">
          <p className="text-sm font-semibold">Row JSON Edit</p>
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            className="min-h-56 rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] p-3 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-5 py-2 text-sm font-semibold text-[#0b0b0b]"
            >
              Save
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
    </section>
  );
}
