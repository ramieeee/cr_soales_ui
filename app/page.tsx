"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost";
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8000";

const API_URL = `${API_BASE_URL}:${API_PORT}`;
const PROCESS_PATH =
  process.env.NEXT_PUBLIC_PROCESS_PATH ??
  "/api/v1/multimodal_extraction/process";

type UploadStatus = "idle" | "uploading" | "success" | "error";

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
      className = styles.jsonKey;
    } else if (part.startsWith('"')) {
      className = styles.jsonString;
    } else if (/^-?\d/.test(part)) {
      className = styles.jsonNumber;
    } else if (part === "true" || part === "false") {
      className = styles.jsonBoolean;
    } else if (part === "null") {
      className = styles.jsonNull;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setMessage("");
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setStatus("error");
      setMessage("Add a PDF before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);
    formData.append("prompt", prompt || "Describe the document");

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
        <div className={styles.loading}>
          <div className={styles.loadingHeader}>
            <span className={styles.loadingTitle}>
              Uploading to the PDF and processing
            </span>
          </div>
          <div className={styles.loadingBar} aria-hidden="true">
            <span />
          </div>
          <p className={styles.loadingHint}>
            We are reading pages and extracting details.
          </p>
        </div>
      );
    }

    if (!message) return "Your response will appear here after upload.";

    try {
      const parsed = JSON.parse(message);
      const pretty = JSON.stringify(parsed, null, 2);
      return <pre className={styles.jsonBlock}>{highlightJson(pretty)}</pre>;
    } catch {
      return <pre className={styles.jsonBlock}>{message}</pre>;
    }
  };

  return (
    <div className={styles.page}>
      <canvas className={styles.starfield} ref={canvasRef} aria-hidden />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.kicker}>CR SOLES</p>
        </header>

        <section className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div
              className={`${styles.dropzone} ${
                isDragging ? styles.dragging : ""
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
                className={styles.fileInput}
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  handleFile(event.target.files?.[0] ?? null)
                }
              />
              <div className={styles.dropContent}>
                <div className={styles.dropIcon} aria-hidden="true">
                  <span />
                </div>
                <div>
                  <p className={styles.dropTitle}>
                    {selectedFile ? selectedFile.name : "Drop your PDF here"}
                  </p>
                  <p className={styles.dropHint}>
                    {selectedFile
                      ? "Click to replace the file"
                      : "or click to browse from your device"}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.controls}>
              <label className={styles.field}>
                <span>Prompt</span>
                <input
                  type="text"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the document"
                />
              </label>
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={status === "uploading"}
                >
                  {status === "uploading" ? "Uploading..." : "Upload PDF"}
                </button>
                <button
                  className={`${styles.button} ${styles.secondaryButton}`}
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
            className={`${styles.status} ${
              status === "error"
                ? styles.error
                : status === "success"
                  ? styles.success
                  : status === "uploading"
                    ? styles.loadingStatus
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
