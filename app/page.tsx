"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost";
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8000";

const API_URL = `${API_BASE_URL}:${API_PORT}`;
const PROCESS_PATH =
  process.env.NEXT_PUBLIC_PROCESS_PATH ??
  "/api/v1/multimodal_extraction/extract";

type UploadStatus = "idle" | "uploading" | "success" | "error";

const jsonClassMap = {
  key: "text-[#cfcfcf]",
  string: "text-[#e0e0e0]",
  number: "text-[#bdbdbd]",
  boolean: "text-[#d6d6d6]",
  null: "text-[#9a9a9a]",
} as const;

const baseInputClass =
  'rounded-xl border border-white/[0.18] bg-[rgba(12,12,12,0.9)] px-[14px] py-3 text-sm text-[#f2f2f2] transition-[border-color,box-shadow] duration-200 ease-in focus:border-white/45 focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)] [font-family:var(--font-body),"Helvetica_Neue",Arial,sans-serif]';

const buttonClass =
  "min-w-40 rounded-full border-none bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-7 py-3 text-sm font-semibold text-[#0b0b0b] shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-200 ease-in enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-70 disabled:shadow-none max-[900px]:w-full";

const isPdfFile = (file: File) => {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
};

const highlightJson = (value: string) => {
  const tokenRegex =
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

  return value.split(tokenRegex).map((part, index) => {
    if (!part) return null;
    let className = "";

    if (part.startsWith('"') && part.endsWith('":')) {
      className = jsonClassMap.key;
    } else if (part.startsWith('"')) {
      className = jsonClassMap.string;
    } else if (/^-?\d/.test(part)) {
      className = jsonClassMap.number;
    } else if (part === "true" || part === "false") {
      className = jsonClassMap.boolean;
    } else if (part === "null") {
      className = jsonClassMap.null;
    }

    return (
      <span key={`${part}-${index}`} className={className || undefined}>
        {part}
      </span>
    );
  });
};

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prompt, setPrompt] = useState("Describe the document");
  const [ingestionSource, setIngestionSource] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    pdf?: string;
    ingestionSource?: string;
  }>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    const strandCount = 90;
    const pointsPerStrand = 60;
    const points: { x: number; y: number; size: number; linkCap: number }[] =
      [];

    const purple = { r: 255, g: 60, b: 255 };
    const green = { r: 0, g: 255, b: 200 };

    const randomInRange = (min: number, max: number) =>
      min + Math.random() * (max - min);

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      width = innerWidth;
      height = innerHeight;
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const initStrands = () => {
      points.length = 0;
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const ringRadius = Math.min(width, height) * 0.3;
      const ringThickness = ringRadius * 0.4;
      const totalPoints = strandCount * pointsPerStrand;

      for (let i = 0; i < totalPoints; i += 1) {
        const angle =
          (i / totalPoints) * Math.PI * 2 + randomInRange(-0.35, 0.35);
        const radius =
          ringRadius +
          randomInRange(-ringThickness, ringThickness) +
          randomInRange(-4, 4);
        const x = centerX + Math.cos(angle) * radius + randomInRange(-6, 6);
        const y = centerY + Math.sin(angle) * radius + randomInRange(-6, 6);

        points.push({
          x,
          y,
          size: randomInRange(0.35, 0.9),
          linkCap: 1,
        });
      }

      const ambientCount = Math.round(totalPoints * 0.18);
      for (let i = 0; i < ambientCount; i += 1) {
        const angle =
          (i / ambientCount) * Math.PI * 2 + randomInRange(-0.4, 0.4);
        const radius =
          ringRadius + randomInRange(-ringThickness * 1.4, ringThickness * 1.4);
        const x =
          centerX +
          Math.cos(angle) * radius +
          randomInRange(-width * 0.07, width * 0.07);
        const y =
          centerY +
          Math.sin(angle) * radius +
          randomInRange(-height * 0.07, height * 0.07);
        points.push({
          x,
          y,
          size: randomInRange(0.3, 0.7),
          linkCap: 1,
        });
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#050409";
      context.fillRect(0, 0, width, height);

      const cellSize = 120;
      const connectionDistance = 50;
      const maxConnections = 2;
      const grid = new Map<string, number[]>();
      const colors: { r: number; g: number; b: number }[] = [];

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const mix = Math.min(1, Math.max(0, point.x / width));
        colors[i] = {
          r: Math.round(lerp(purple.r, green.r, mix)),
          g: Math.round(lerp(purple.g, green.g, mix)),
          b: Math.round(lerp(purple.b, green.b, mix)),
        };

        const cx = Math.floor(point.x / cellSize);
        const cy = Math.floor(point.y / cellSize);
        const key = `${cx},${cy}`;
        if (!grid.has(key)) {
          grid.set(key, []);
        }
        grid.get(key)?.push(i);
      }

      context.lineWidth = 0.7;
      context.shadowBlur = 0;
      for (let i = 0; i < points.length; i += 1) {
        const { x: ax, y: ay } = points[i];
        const cx = Math.floor(ax / cellSize);
        const cy = Math.floor(ay / cellSize);
        let connections = 0;
        const cap = points[i].linkCap;
        for (let gx = -1; gx <= 1; gx += 1) {
          for (let gy = -1; gy <= 1; gy += 1) {
            const neighborKey = `${cx + gx},${cy + gy}`;
            const bucket = grid.get(neighborKey);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue;
              const { x: bx, y: by } = points[j];
              const distance = Math.hypot(ax - bx, ay - by);
              if (distance > connectionDistance) continue;
              const alpha = (1 - distance / connectionDistance) * 0.95;
              const { r, g, b } = colors[i];
              context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
              context.beginPath();
              context.moveTo(ax, ay);
              context.lineTo(bx, by);
              context.stroke();
              connections += 1;
              if (connections >= Math.min(maxConnections, cap)) {
                break;
              }
            }
            if (connections >= Math.min(maxConnections, cap)) {
              break;
            }
          }
          if (connections >= Math.min(maxConnections, cap)) {
            break;
          }
        }
      }

      context.shadowBlur = 0;
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.fill();
      }
    };

    const handleResize = () => {
      resize();
      initStrands();
      draw();
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!isPdfFile(file)) {
      setStatus("error");
      setMessage("Only PDF files are supported.");
      setSelectedFile(null);
      setFieldErrors((prev) => ({
        ...prev,
        pdf: "PDF file is required (only .pdf is supported).",
      }));
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setMessage("");
    setFieldErrors((prev) => ({ ...prev, pdf: undefined }));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: { pdf?: string; ingestionSource?: string } = {};

    if (!selectedFile) {
      setStatus("error");
      setMessage("Add a PDF before uploading.");
      nextErrors.pdf = "PDF is required.";
    }

    if (!ingestionSource.trim()) {
      nextErrors.ingestionSource = "Ingestion source is required.";
    }

    if (nextErrors.pdf || nextErrors.ingestionSource) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      if (!message) {
        setMessage("Please fill the required fields.");
      }
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);
    formData.append("prompt", prompt || "Describe the document");
    formData.append("ingestion_source", ingestionSource.trim());

    setStatus("uploading");
    setMessage("Uploading to the PDF and processing...");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}${PROCESS_PATH}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed.");
      }

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? JSON.stringify(await response.json(), null, 2)
        : await response.text();

      setStatus("success");
      setMessage(payload || "Upload completed.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        setMessage("Upload cancelled.");
      } else {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        setStatus("error");
        setMessage(message);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    abortRef.current = null;
  };

  const renderMessage = () => {
    if (status === "uploading") {
      return (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold tracking-[0.02em] text-[#e6e6e6]">
              Uploading to the PDF and processing
            </span>
          </div>
          <div
            className="relative h-[10px] overflow-hidden rounded-full bg-white/12"
            aria-hidden="true"
          >
            <span className="absolute inset-0 animate-loading-sweep bg-[linear-gradient(90deg,rgba(255,255,255,0),#e5e5e5,#9d9d9d,rgba(255,255,255,0))]" />
          </div>
          <p className="m-0 text-[13px] text-[#a5a5a5]">
            We are reading pages and extracting details.
          </p>
        </div>
      );
    }

    if (!message) return "Your response will appear here after upload.";

    try {
      const parsed = JSON.parse(message);
      const pretty = JSON.stringify(parsed, null, 2);
      return (
        <pre className='m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.6] [overflow-wrap:anywhere] [font-family:var(--font-display),"Manrope",sans-serif]'>
          {highlightJson(pretty)}
        </pre>
      );
    } catch {
      return (
        <pre className='m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.6] [overflow-wrap:anywhere] [font-family:var(--font-display),"Manrope",sans-serif]'>
          {message}
        </pre>
      );
    }
  };

  return (
    <div className="relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto bg-[#0b0b0b] px-6 py-20 text-[#f2f2f2] max-sm:px-4 max-sm:py-[60px]">
      <canvas
        className="pointer-events-none fixed inset-0 z-0"
        ref={canvasRef}
        aria-hidden
      />
      <main className="relative z-[1] grid w-full max-w-[980px] gap-10 animate-fade-in-up">
        <header className="grid max-w-[620px] gap-2">
          <p className='text-xs font-semibold uppercase leading-[1.2] tracking-[0.28em] text-[#a5a5a5] [font-family:var(--font-display),"Helvetica_Neue",Arial,sans-serif]'>
            CR SOLES
          </p>
        </header>

        <section className="relative grid gap-6 rounded-[26px] border border-white/14 bg-[rgba(18,18,18,0.76)] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-[10px] backdrop-saturate-[165%] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))] before:opacity-80 [&>*]:relative [&>*]:z-[1] max-sm:p-6 animate-float-in">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div
              className={`cursor-pointer rounded-[20px] border-[1.5px] border-dashed border-white/12 bg-[linear-gradient(140deg,rgba(26,26,26,0.95),rgba(16,16,16,0.98)_58%)] p-7 transition-[border-color,background,box-shadow] duration-200 ease-in hover:border-white/40 ${
                isDragging
                  ? "border-[#f0f0f0] bg-[linear-gradient(140deg,rgba(32,32,32,0.98),rgba(18,18,18,0.98)_60%)] shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
                  : ""
              } ${
                fieldErrors.pdf
                  ? "!border-[rgba(255,96,96,0.9)] shadow-[0_0_0_4px_rgba(255,96,96,0.14)]"
                  : ""
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
            >
              <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  handleFile(event.target.files?.[0] ?? null)
                }
              />
              <div className="grid grid-cols-[auto_1fr] items-center gap-4 max-sm:grid-cols-1">
                <div className="max-sm:h-12 max-sm:w-12" aria-hidden="true">
                  <span />
                </div>
                <div>
                  <p className="text-[18px] font-semibold">
                    {selectedFile ? selectedFile.name : "Drop your PDF here"}
                  </p>
                  <p className="text-sm text-[#a5a5a5]">
                    {selectedFile
                      ? "Click to replace the file"
                      : "or click to browse from your device"}
                  </p>
                  {fieldErrors.pdf ? (
                    <p
                      id="pdf-error"
                      className="mt-2 text-xs font-semibold leading-[1.3] text-[rgba(255,170,170,0.95)]"
                      role="alert"
                    >
                      {fieldErrors.pdf}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-[18px] max-[900px]:grid-cols-1">
              <label className="grid gap-2 text-sm font-semibold">
                <span className="text-[#a5a5a5]">Prompt</span>
                <input
                  type="text"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the document"
                  className={baseInputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                <span className="text-[#a5a5a5]">Ingestion source</span>
                <input
                  type="text"
                  value={ingestionSource}
                  onChange={(event) => {
                    const value = event.target.value;
                    setIngestionSource(value);
                    if (value.trim()) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        ingestionSource: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter ingestion source"
                  className={`${baseInputClass} ${
                    fieldErrors.ingestionSource
                      ? "!border-[rgba(255,96,96,0.9)] shadow-[0_0_0_4px_rgba(255,96,96,0.14)]"
                      : ""
                  }`}
                  aria-invalid={fieldErrors.ingestionSource ? true : undefined}
                  aria-describedby={
                    fieldErrors.ingestionSource
                      ? "ingestion-source-error"
                      : undefined
                  }
                />
                {fieldErrors.ingestionSource ? (
                  <span
                    id="ingestion-source-error"
                    className="mt-2 text-xs font-semibold leading-[1.3] text-[rgba(255,170,170,0.95)]"
                    role="alert"
                  >
                    {fieldErrors.ingestionSource}
                  </span>
                ) : null}
              </label>
              <div className="flex flex-wrap items-center justify-end gap-3 max-[900px]:w-full">
                <button
                  className={buttonClass}
                  type="submit"
                  disabled={status === "uploading"}
                >
                  {status === "uploading" ? "Uploading..." : "Upload PDF"}
                </button>
                <button
                  className={`${buttonClass} border border-white/12 bg-[rgba(18,18,18,0.9)] text-[#f2f2f2] shadow-none disabled:cursor-not-allowed disabled:opacity-60`}
                  type="button"
                  onClick={handleCancel}
                  disabled={status !== "uploading"}
                >
                  Request Cancel
                </button>
              </div>
            </div>
          </form>

          <div
            className={`max-h-[45vh] min-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/12 bg-[linear-gradient(160deg,rgba(10,10,10,0.9),rgba(18,18,18,0.78))] p-4 text-[13px] text-[#bdbdbd] [overflow-wrap:anywhere] max-sm:max-h-[38vh] max-sm:min-h-[200px] ${
              status === "error"
                ? "bg-[rgba(255,255,255,0.06)] text-[#f0b8a6]"
                : status === "success"
                  ? "bg-[rgba(255,255,255,0.06)] text-[#d8d8d8]"
                  : status === "uploading"
                    ? "border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_18px_40px_rgba(0,0,0,0.4)]"
                    : ""
            }`}
            role="status"
          >
            {renderMessage()}
          </div>
        </section>
      </main>
    </div>
  );
}
