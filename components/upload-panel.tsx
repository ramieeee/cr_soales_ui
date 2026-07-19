"use client";

import { useRef, useState } from "react";

import { LoadingSignal } from "@/components/loading-signal";
import { useUploadSession } from "@/components/upload-session";

const isPdfFile = (file: File) => {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
};

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    status,
    message,
    startUpload,
    vllmBaseUrl,
    vllmPort,
    setVllmBaseUrl,
    setVllmPort,
  } = useUploadSession();

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

    await startUpload({
      pdf: file,
      vllmBaseUrl: vllmBaseUrl.trim() || undefined,
      vllmPort: vllmPort.trim() || undefined,
    });
  };

  return (
    <section className="relative">
      {status === "uploading" ? (
        <LoadingSignal
          label="Uploading Dataset"
          detail="Sending PDF to the server to extract data..."
        />
      ) : null}

      <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="soales-subheading mb-2 text-2xl leading-8 tracking-[-0.02em] text-[#dae2fd] md:text-4xl md:leading-10">
            Paper Upload
          </h1>
          <p className="soales-mono uppercase text-[#ccc3d8]/80">
            Upload PDF to extract text
          </p>
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-6 xl:grid-cols-12"
      >
        <section className="soales-panel relative flex h-[400px] flex-col overflow-hidden rounded-2xl shadow-lg xl:col-span-8">
          <div
            className={`relative z-10 m-6 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl px-4 text-center transition-all duration-300 ${
              isDragging
                ? "bg-[#1f2937] shadow-[inset_0_0_18px_rgba(56,189,248,0.14)]"
                : "bg-[#0b1220] hover:bg-[#111827]"
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
              onChange={(event) =>
                handleFileSelect(event.target.files?.[0] ?? null)
              }
              className="hidden"
            />
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1f2937] shadow-inner transition-transform duration-500 hover:scale-110">
              <span className="material-symbols-outlined text-4xl text-[#93c5fd]">
                cloud_upload
              </span>
            </div>
            <h3 className="soales-subheading mb-2 text-2xl text-[#dae2fd]">
              {file ? file.name : "Send PDF to OCR"}
            </h3>
            <p className="mb-6 max-w-md text-[#ccc3d8]">
              {isDragging ? (
                "Release the PDF here to start the upload"
              ) : file ? null : (
                <>
                  <span className="block">Drag and drop PDF sets here</span>
                  <span className="block">
                    or click to browse your local files
                  </span>
                </>
              )}
            </p>
            <div className="flex items-center gap-4 text-[#ccc3d8]/60">
              <span className="soales-mono rounded bg-[#1f2937] px-3 py-1">
                .PDF
              </span>
              <span className="soales-mono rounded bg-[#1f2937] px-3 py-1">
                MAX 500MB
              </span>
            </div>
          </div>
        </section>

        <aside className="soales-panel flex h-[400px] flex-col rounded-2xl shadow-lg xl:col-span-4">
          <div className="flex items-center justify-between bg-[#1f2937] p-6">
            <h3 className="soales-mono uppercase tracking-widest text-[#93c5fd]">
              Upload
            </h3>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div className="rounded-xl bg-[#0b1220] p-4 text-sm leading-6 text-[#ccc3d8]">
              LLM Server IP and Port inputs are optional
            </div>

            <label className="block space-y-2">
              <span className="soales-mono text-xs uppercase tracking-widest text-[#93c5fd]">
                LLM server IP
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={vllmBaseUrl}
                onChange={(event) => {
                  const next = event.target.value.replace(/[^\d.]/g, "");
                  setVllmBaseUrl(next);
                }}
                placeholder="e.g. 203.0.113.10"
                disabled={status === "uploading"}
                className="w-full rounded-lg border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#dae2fd] outline-none placeholder:text-[#6b7280] focus:border-[#93c5fd]"
              />
            </label>

            <label className="block space-y-2">
              <span className="soales-mono text-xs uppercase tracking-widest text-[#93c5fd]">
                LLM server port
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={vllmPort}
                onChange={(event) => {
                  const next = event.target.value.replace(/\D/g, "");
                  setVllmPort(next);
                }}
                placeholder="e.g. 8000"
                disabled={status === "uploading"}
                className="w-full rounded-lg border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#dae2fd] outline-none placeholder:text-[#6b7280] focus:border-[#93c5fd]"
              />
            </label>

            {formError ? (
              <div className="rounded bg-[#93000a]/20 p-3 text-sm text-[#ffdad6]">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status === "uploading"}
              className="soales-button-primary w-full disabled:opacity-70"
            >
              <span className="material-symbols-outlined">
                {status === "uploading" ? "sync" : "cloud_upload"}
              </span>
              {status === "uploading" ? "Uploading..." : "Execute OCR"}
            </button>
          </div>
        </aside>
      </form>

      <section className="soales-panel mt-6 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between bg-[#1f2937] p-6">
          <div>
            <h2 className="soales-mono uppercase tracking-widest text-[#ffb95f]">
              Server Response
            </h2>
            <p className="mt-2 text-sm text-[#ccc3d8]">
              OCR upload result appears here
            </p>
          </div>
          <span className="material-symbols-outlined text-[#93c5fd]">
            terminal
          </span>
        </div>
        <pre className="min-h-36 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[#01030b]/60 p-6 font-mono text-sm leading-6 text-[#dae2fd]">
          {message || "Awaiting transfer signal."}
        </pre>
      </section>
    </section>
  );
}
