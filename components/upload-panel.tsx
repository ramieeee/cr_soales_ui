"use client";

import { useRef, useState } from "react";

import { useUploadSession } from "@/components/upload-session";

const isPdfFile = (file: File) => {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
};

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("Describe the document");
  const [ingestionSource, setIngestionSource] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState("");
  const { status, message, startUpload } = useUploadSession();

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!file || !isPdfFile(file)) {
      setFormError("Please select a valid PDF file.");
      return;
    }

    if (!ingestionSource.trim()) {
      setFormError("Ingestion source is required.");
      return;
    }
    await startUpload({
      pdf: file,
      prompt: prompt || "Describe the document",
      ingestionSource: ingestionSource.trim(),
    });
  };

  return (
    <section className="grid gap-5">
      <header>
        <h1 className="text-xl font-semibold">File Upload</h1>
        <p className="mt-1 text-sm text-[#a5a5a5]">
          Upload a PDF and send it directly to the Python API.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)] p-5"
      >
        <label className="grid gap-2 text-sm font-semibold">
          <span className="text-[#a5a5a5]">PDF File</span>
          <div
            className={`cursor-pointer rounded-xl border border-dashed px-4 py-8 text-center text-sm transition-colors ${
              isDragging
                ? "border-white/70 bg-white/[0.08] text-[#f2f2f2]"
                : "border-white/20 bg-[rgba(10,10,10,0.9)] text-[#bdbdbd]"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFileSelect(event.dataTransfer.files?.[0] ?? null);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            {isDragging
              ? "Drop the PDF to upload"
              : file
                ? `Selected: ${file.name}`
                : "Drag and drop a PDF here, or click to choose a file"}
          </div>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          <span className="text-[#a5a5a5]">Prompt</span>
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2 text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          <span className="text-[#a5a5a5]">Ingestion Source</span>
          <input
            type="text"
            value={ingestionSource}
            onChange={(event) => setIngestionSource(event.target.value)}
            placeholder="source name"
            className="rounded-xl border border-white/15 bg-[rgba(10,10,10,0.9)] px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={status === "uploading"}
          className="w-fit rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-6 py-2 text-sm font-semibold text-[#0b0b0b] disabled:opacity-70"
        >
          {status === "uploading" ? "Uploading..." : "Upload"}
        </button>
      </form>

      {formError ? (
        <div className="rounded-2xl border border-red-300/30 bg-red-200/10 p-4 text-sm text-red-200">
          {formError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/12 bg-[rgba(14,14,14,0.72)] p-4 text-sm whitespace-pre-wrap break-words">
        {message || "The server response will appear here."}
      </div>
    </section>
  );
}
