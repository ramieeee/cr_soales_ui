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
    const starCount = 200;
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
      const cellSize = 120;
      const grid = new Map<string, number[]>();
      const positions: { x: number; y: number }[] = [];

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const wobble = Math.sin(time * 0.0004 + star.phase) * 8;
        const angle = star.angle + rotation * star.speed;
        const radius = star.radius + wobble;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        positions[i] = { x, y };

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
              if (distance > 120) continue;
              const alpha = (1 - distance / 120) * 0.4;
              const mix = Math.min(1, Math.max(0, (ax / width) * 1.1));
              const r = Math.round(lerp(purple.r, green.r, mix));
              const g = Math.round(lerp(purple.g, green.g, mix));
              const b = Math.round(lerp(purple.b, green.b, mix));
              context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
              context.beginPath();
              context.moveTo(ax, ay);
              context.lineTo(bx, by);
              context.stroke();
            }
          }
        }
      }

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const { x, y } = positions[i];
        const twinkle =
          (Math.sin(time * 0.002 + star.phase) + 1) * 0.5 * star.twinkle;
        const glow = 1 + twinkle * 0.6;
        context.fillStyle = `rgba(255, 255, 255, ${0.6 + twinkle * 0.4})`;
        context.shadowBlur = 6 * glow;
        context.shadowColor = "rgba(255, 255, 255, 0.7)";
        context.beginPath();
        context.arc(x, y, star.size * glow, 0, Math.PI * 2);
        context.fill();
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

  return (
    <div className={styles.page}>
      <canvas className={styles.starfield} ref={canvasRef} aria-hidden />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.kicker}>CR Soles</p>
          <h1>Send a PDF straight to your processing API.</h1>
          <p className={styles.subhead}>
            Drag and drop a file and add a prompt.
          </p>
          <p className={styles.subhead}>
            FastAPI backend running on localhost:8000
          </p>
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
                  <p className={styles.dropTitle}>Drop your PDF here</p>
                  <p className={styles.dropHint}>
                    or click to browse from your device
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.meta}>
              <div>
                <p className={styles.metaLabel}>Selected file</p>
                <p className={styles.metaValue}>
                  {selectedFile ? selectedFile.name : "No file chosen yet."}
                </p>
              </div>
              <span className={styles.badge}>PDF only</span>
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
            {message || "Your response will appear here after upload."}
          </div>
        </section>
      </main>
    </div>
  );
}
