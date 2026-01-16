"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
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

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    const starCount = 20;
    const stars: {
      radius: number;
      angle: number;
      speed: number;
      size: number;
      twinkle: number;
      phase: number;
    }[] = [];
    let rotation = 0;
    let baseRadius = 0;
    let lastTime = 0;

    const purple = { r: 170, g: 80, b: 255 };
    const green = { r: 70, g: 255, b: 200 };

    const randomInRange = (min: number, max: number) =>
      min + Math.random() * (max - min);

    const resize = () => {
      const { innerWidth, innerHeight, devicePixelRatio } = window;
      width = innerWidth;
      height = innerHeight;
      baseRadius = Math.min(innerWidth, innerHeight) * 0.45;
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < starCount; i += 1) {
        const radius =
          Math.sqrt(Math.random()) * baseRadius + randomInRange(-18, 18);
        const angle = Math.random() * Math.PI * 2;
        stars.push({
          radius,
          angle,
          speed: randomInRange(0.85, 1.2),
          size: randomInRange(0.5, 1.6),
          twinkle: randomInRange(0.6, 1),
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      const rotationSpeed = (Math.PI * 2) / 90000;
      rotation += rotationSpeed * (delta || 16.7);

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#050409";
      context.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const cellSize = 140;
      const connectionDistance = 100;
      const maxConnections = 3;
      const grid = new Map<string, number[]>();
      const positions: { x: number; y: number }[] = [];
      const lineColors: { r: number; g: number; b: number }[] = [];

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const wobble = Math.sin(time * 0.0004 + star.phase) * 8;
        const angle = star.angle + rotation * star.speed;
        const radius = star.radius + wobble;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        positions[i] = { x, y };
        const mix = Math.min(1, Math.max(0, (x / width) * 1.1));
        lineColors[i] = {
          r: Math.round(lerp(purple.r, green.r, mix)),
          g: Math.round(lerp(purple.g, green.g, mix)),
          b: Math.round(lerp(purple.b, green.b, mix)),
        };

        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        const key = `${cx},${cy}`;
        if (!grid.has(key)) {
          grid.set(key, []);
        }
        grid.get(key)?.push(i);
      }

      context.lineWidth = 0.8;
      for (let i = 0; i < stars.length; i += 1) {
        const { x: ax, y: ay } = positions[i];
        const cx = Math.floor(ax / cellSize);
        const cy = Math.floor(ay / cellSize);
        let connections = 0;
        for (let gx = -1; gx <= 1; gx += 1) {
          for (let gy = -1; gy <= 1; gy += 1) {
            const neighborKey = `${cx + gx},${cy + gy}`;
            const bucket = grid.get(neighborKey);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue;
              const { x: bx, y: by } = positions[j];
              const dx = ax - bx;
              const dy = ay - by;
              const distance = Math.hypot(dx, dy);
              if (distance > connectionDistance) continue;
              const sway = Math.sin(time * 0.0012 + (i + j) * 0.08) * 6;
              const midX = (ax + bx) / 2 + (dy / Math.max(1, distance)) * sway;
              const midY = (ay + by) / 2 - (dx / Math.max(1, distance)) * sway;
              const alpha = (1 - distance / connectionDistance) * 0.45;
              const { r, g, b } = lineColors[i];
              const glowAlpha = Math.min(1, alpha + 0.15);

              context.save();
              context.lineWidth = 2.2;
              context.shadowBlur = 16;
              context.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
              context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
              context.beginPath();
              context.moveTo(ax, ay);
              context.quadraticCurveTo(midX, midY, bx, by);
              context.stroke();

              context.lineWidth = 0.9;
              context.shadowBlur = 6;
              context.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
              context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
              context.beginPath();
              context.moveTo(ax, ay);
              context.quadraticCurveTo(midX, midY, bx, by);
              context.stroke();
              context.restore();
              connections += 1;
              if (connections >= maxConnections) {
                break;
              }
            }
            if (connections >= maxConnections) {
              break;
            }
          }
          if (connections >= maxConnections) {
            break;
          }
        }
      }

      context.shadowBlur = 0;
      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const { x, y } = positions[i];
        const twinkle =
          (Math.sin(time * 0.002 + star.phase) + 1) * 0.5 * star.twinkle;
        const glow = 1 + twinkle * 0.6;
        context.fillStyle = `rgba(255, 255, 255, ${0.55 + twinkle * 0.35})`;
        if (twinkle > 0.8) {
          context.shadowBlur = 6 * glow;
          context.shadowColor = "rgba(255, 255, 255, 0.7)";
        }
        context.beginPath();
        context.arc(x, y, star.size * glow, 0, Math.PI * 2);
        context.fill();
        if (twinkle > 0.8) {
          context.shadowBlur = 0;
        }
      }

      context.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    initStars();
    lastTime = performance.now();
    animationFrame = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
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
    setMessage("Uploading to the processing API...");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}${PROCESS_PATH}`, {
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
    if (!message) return "Your response will appear here after upload.";

    try {
      const parsed = JSON.parse(message);
      const pretty = JSON.stringify(parsed, null, 2);
      return (
        <pre className={styles.jsonBlock}>
          {highlightJson(pretty)}
        </pre>
      );
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
