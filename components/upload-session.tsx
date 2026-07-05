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
  startUpload: (params: { pdf: File }) => Promise<void>;
};

const UploadSessionContext = createContext<UploadSessionContextValue | null>(null);

export function UploadSessionProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");

  const startUpload = useCallback(
    async (params: { pdf: File }) => {
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
      ? "text-[#ffdad6] bg-[#7f1d1d]/35"
      : status === "success"
        ? "text-[#bfdbfe] bg-[#1f2937]"
        : status === "uploading"
          ? "text-[#93c5fd] bg-[#1f2937]"
          : "text-[#9ca3af] bg-[#111827]";

  return (
    <div
      className={`mx-3 min-w-[10.75rem] rounded-lg p-3 transition-colors duration-200 ease-out ${
        status === "uploading" ? "animate-pulse" : ""
      } ${toneClass}`}
    >
      <p className="soales-mono uppercase">Upload Status</p>
      <p className="mt-2 line-clamp-4 text-xs whitespace-pre-wrap break-words">
        {message || "No upload has been started yet."}
      </p>
    </div>
  );
}
