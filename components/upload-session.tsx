"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { uploadDocument } from "@/lib/paper-review-api";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type UploadSessionContextValue = {
  status: UploadStatus;
  message: string;
  startUpload: (params: {
    pdf: File;
    prompt: string;
    ingestionSource: string;
  }) => Promise<void>;
};

const UploadSessionContext = createContext<UploadSessionContextValue | null>(null);

export function UploadSessionProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");

  const startUpload = useCallback(
    async (params: { pdf: File; prompt: string; ingestionSource: string }) => {
      setStatus("uploading");
      setMessage("Uploading to Python server...");

      try {
        const payload = await uploadDocument(params);
        setStatus("success");
        setMessage(
          typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
        );
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      status,
      message,
      startUpload,
    }),
    [status, message, startUpload],
  );

  return (
    <UploadSessionContext.Provider value={value}>
      {children}
    </UploadSessionContext.Provider>
  );
}

export const useUploadSession = () => {
  const context = useContext(UploadSessionContext);
  if (!context) {
    throw new Error("useUploadSession must be used inside UploadSessionProvider");
  }
  return context;
};

export function UploadStatusCard() {
  const { status, message } = useUploadSession();

  const toneClass =
    status === "error"
      ? "text-[#f0b8a6] border-red-300/30"
      : status === "success"
        ? "text-[#d8d8d8] border-emerald-300/20"
        : status === "uploading"
          ? "text-[#e6e6e6] border-white/30"
          : "text-[#a5a5a5] border-white/12";

  return (
    <div
      className={`mt-5 rounded-xl border bg-[rgba(12,12,12,0.75)] p-3 transition-colors duration-200 ease-out ${
        status === "uploading" ? "animate-pulse" : ""
      } ${toneClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">Upload Status</p>
      <p className="mt-2 line-clamp-4 text-xs whitespace-pre-wrap break-words">
        {message || "No upload has been started yet."}
      </p>
    </div>
  );
}
