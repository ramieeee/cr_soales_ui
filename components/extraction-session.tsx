"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { streamExtractPaper, type PaperRow } from "@/lib/paper-review-api";

type ExtractionStatus = "extracting" | "success" | "error";

type ExtractionSession = {
  id: string;
  paperId: string;
  paperTitle: string;
  output: string;
  status: ExtractionStatus;
  minimized: boolean;
  createdAt: number;
};

type StartExtractionParams = {
  row: PaperRow;
  paperTitle: string;
};

type ExtractionSessionContextValue = {
  sessions: ExtractionSession[];
  expandedSessionId: string | null;
  startExtraction: (params: StartExtractionParams) => Promise<void>;
  minimizeSession: (id: string) => void;
  expandSession: (id: string) => void;
  closeExpandedSession: () => void;
};

const ExtractionSessionContext =
  createContext<ExtractionSessionContextValue | null>(null);

const resolvePaperId = (row: PaperRow) => {
  const candidates = [row.paper_id, row.id, row.idx, row.uuid, row._id];
  const value = candidates.find(
    (item) => item !== undefined && item !== null && item !== "",
  );

  if (value === undefined) {
    throw new Error("Missing paper_id for extraction");
  }

  return String(value);
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Extract failed";
};

const updateSession = (
  sessions: ExtractionSession[],
  id: string,
  updater: (session: ExtractionSession) => ExtractionSession,
) => sessions.map((session) => (session.id === id ? updater(session) : session));

export function ExtractionSessionProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sessions, setSessions] = useState<ExtractionSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const minimizeSession = useCallback((id: string) => {
    setSessions((current) =>
      updateSession(current, id, (session) => ({ ...session, minimized: true })),
    );
    setExpandedSessionId((current) => (current === id ? null : current));
  }, []);

  const expandSession = useCallback((id: string) => {
    setSessions((current) =>
      updateSession(current, id, (session) => ({ ...session, minimized: false })),
    );
    setExpandedSessionId(id);
  }, []);

  const closeExpandedSession = useCallback(() => {
    setExpandedSessionId(null);
  }, []);

  const startExtraction = useCallback(async ({ row, paperTitle }: StartExtractionParams) => {
    const paperId = resolvePaperId(row);
    const sessionId = `${paperId}-${Date.now()}`;
    const title = paperTitle.trim() || `Paper ${paperId}`;

    setSessions((current) => [
      {
        id: sessionId,
        paperId,
        paperTitle: title,
        output: "",
        status: "extracting",
        minimized: false,
        createdAt: Date.now(),
      },
      ...current,
    ]);

    try {
      await streamExtractPaper(row, (chunk) => {
        setSessions((current) =>
          updateSession(current, sessionId, (session) => ({
            ...session,
            output: session.output + chunk,
          })),
        );
      });

      setSessions((current) =>
        updateSession(current, sessionId, (session) => ({
          ...session,
          status: "success",
          output: session.output.trim()
            ? session.output
            : "Extraction completed.",
        })),
      );
    } catch (error) {
      setSessions((current) =>
        updateSession(current, sessionId, (session) => ({
          ...session,
          status: "error",
          output: session.output.trim()
            ? `${session.output}\n\n${toErrorMessage(error)}`
            : toErrorMessage(error),
        })),
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      expandedSessionId,
      startExtraction,
      minimizeSession,
      expandSession,
      closeExpandedSession,
    }),
    [
      sessions,
      expandedSessionId,
      startExtraction,
      minimizeSession,
      expandSession,
      closeExpandedSession,
    ],
  );

  return (
    <ExtractionSessionContext.Provider value={value}>
      {children}
    </ExtractionSessionContext.Provider>
  );
}

export const useExtractionSession = () => {
  const context = useContext(ExtractionSessionContext);
  if (!context) {
    throw new Error(
      "useExtractionSession must be used inside ExtractionSessionProvider",
    );
  }
  return context;
};

const iconButtonClass =
  "grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-[#d8d8d8] transition-colors duration-150 ease-out hover:border-white/30 hover:bg-white/[0.08]";

function MinimizeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M3 8h10" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3H3v3" />
      <path d="M10 3h3v3" />
      <path d="M6 13H3v-3" />
      <path d="M10 13h3v-3" />
      <path d="M3 3l3 3" />
      <path d="M13 3l-3 3" />
      <path d="M3 13l3-3" />
      <path d="M13 13l-3-3" />
    </svg>
  );
}

const statusLabel = (status: ExtractionStatus) => {
  if (status === "extracting") return "Extracting...";
  if (status === "error") return "Extract failed";
  return "Extraction complete";
};

const statusToneClass = (status: ExtractionStatus) => {
  if (status === "error") return "text-red-200 border-red-300/30";
  if (status === "success") return "text-emerald-100 border-emerald-300/25";
  return "text-[#f3f1ea] border-amber-200/20";
};

export function ExtractionDock() {
  const {
    sessions,
    expandedSessionId,
    minimizeSession,
    expandSession,
    closeExpandedSession,
  } = useExtractionSession();

  const expandedSession =
    sessions.find((session) => session.id === expandedSessionId) ?? null;

  if (!sessions.length) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto">
        {sessions.map((session) => {
          const minimized = session.minimized && expandedSessionId !== session.id;

          return (
            <article
              key={session.id}
              className={`pointer-events-auto overflow-hidden rounded-[1.35rem] border bg-[linear-gradient(180deg,rgba(28,26,22,0.96),rgba(14,14,14,0.96))] shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur ${
                minimized ? "p-3" : "p-4"
              } ${statusToneClass(session.status)}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#f5f0e6]">
                    {session.paperTitle}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#c7bca7]">
                    {statusLabel(session.status)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!minimized ? (
                    <button
                      type="button"
                      onClick={() => minimizeSession(session.id)}
                      className={iconButtonClass}
                      aria-label="Minimize extraction panel"
                    >
                      <MinimizeIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => expandSession(session.id)}
                    className={iconButtonClass}
                    aria-label="Expand extraction panel"
                  >
                    <ExpandIcon />
                  </button>
                </div>
              </div>

              {!minimized ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#f7f3ea]">
                    {session.output || "Waiting for stream output..."}
                  </pre>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {expandedSession ? (
        <div className="ui-fade-in fixed inset-0 z-50 bg-black/70 p-4 md:p-6">
          <div className="ui-pop mx-auto flex h-full max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(24,22,19,0.98),rgba(10,10,10,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-7">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-[#f8f1e5]">
                  {expandedSession.paperTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#c7bca7]">
                  {statusLabel(expandedSession.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeExpandedSession}
                className={iconButtonClass}
                aria-label="Minimize expanded extraction modal"
              >
                <MinimizeIcon />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-4 md:p-6">
              <div className="h-full rounded-[1.5rem] border border-white/10 bg-black/35 p-4 md:p-5">
                <pre className="h-full overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#f7f3ea]">
                  {expandedSession.output || "Waiting for stream output..."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
