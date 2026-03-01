"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  hidden: boolean;
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
  restoreSession: (id: string) => void;
  expandSession: (id: string) => void;
  dismissSession: (id: string) => void;
  revealSessionByPaperId: (paperId: string) => void;
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

type ParsedStreamEvent = {
  event: string;
  data: Record<string, unknown> | string | null;
};

type OutputSection = {
  node: string;
  content: string;
};

const parseJsonSafely = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return value;
  }
};

const parseSseBlocks = (buffer: string) => {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  const trailing = normalized.endsWith("\n\n") ? "" : blocks.pop() ?? "";

  const events = blocks
    .map((block) => {
      const lines = block.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (!eventLine) return null;

      return {
        event: eventLine.slice(6).trim(),
        data: dataLines.length ? parseJsonSafely(dataLines.join("\n")) : null,
      } satisfies ParsedStreamEvent;
    })
    .filter((event): event is ParsedStreamEvent => event !== null);

  return { events, trailing };
};

const normalizeNodeLabel = (node: string) => node.trim() || "general";

const formatNodeLabel = (node: string) => `[${normalizeNodeLabel(node)}]`;

const ensureActiveSection = (
  sections: OutputSection[],
  node: string,
  forceNew: boolean,
) => {
  const normalizedNode = normalizeNodeLabel(node);
  const lastSection = sections.at(-1);

  if (!forceNew && lastSection && lastSection.node === normalizedNode) {
    return lastSection;
  }

  const nextSection: OutputSection = {
    node: normalizedNode,
    content: "",
  };
  sections.push(nextSection);
  return nextSection;
};

const appendLine = (section: OutputSection, value: string) => {
  const line = value.trim();
  if (!line) return;
  if (!section.content) {
    section.content = line;
    return;
  }

  const existingLines = section.content.split("\n");
  if (existingLines.at(-1) === line) return;
  section.content = `${section.content}\n${line}`;
};

const appendToken = (section: OutputSection, token: string) => {
  if (!token) return;
  section.content += token;
};

const renderSections = (sections: OutputSection[]) =>
  sections
    .map((section) => {
      const text = section.content.trim();
      if (!text) return formatNodeLabel(section.node);
      return `${formatNodeLabel(section.node)}\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");

const appendParsedEvent = (
  event: ParsedStreamEvent,
  sections: OutputSection[],
) => {
  if (!event.data || typeof event.data === "string") return;

  const node =
    typeof event.data.node === "string" && event.data.node.trim()
      ? event.data.node
      : "general";

  if (event.event === "llm_token") {
    const token = typeof event.data.token === "string" ? event.data.token : "";
    const section = ensureActiveSection(sections, node, false);
    appendToken(section, token);
    return;
  }

  if (event.event === "node_progress") {
    ensureActiveSection(sections, node, false);
  }
};

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

  const restoreSession = useCallback((id: string) => {
    setSessions((current) =>
      updateSession(current, id, (session) => ({ ...session, minimized: false })),
    );
    setExpandedSessionId((current) => (current === id ? null : current));
  }, []);

  const expandSession = useCallback((id: string) => {
    setSessions((current) =>
      updateSession(current, id, (session) => ({
        ...session,
        minimized: false,
        hidden: false,
      })),
    );
    setExpandedSessionId(id);
  }, []);

  const dismissSession = useCallback((id: string) => {
    setSessions((current) =>
      updateSession(current, id, (session) => ({ ...session, hidden: true })),
    );
    setExpandedSessionId((current) => (current === id ? null : current));
  }, []);

  const revealSessionByPaperId = useCallback((paperId: string) => {
    setSessions((current) => {
      const target = current.find((session) => session.paperId === paperId);
      if (!target) return current;

      return updateSession(current, target.id, (session) => ({
        ...session,
        hidden: false,
        minimized: false,
      }));
    });
  }, []);

  const closeExpandedSession = useCallback(() => {
    setExpandedSessionId(null);
  }, []);

  const startExtraction = useCallback(async ({ row, paperTitle }: StartExtractionParams) => {
    const paperId = resolvePaperId(row);
    const sessionId = `${paperId}-${Date.now()}`;
    const title = paperTitle.trim() || `Paper ${paperId}`;
    let streamBuffer = "";
    const sections: OutputSection[] = [];

    setSessions((current) => [
      {
        id: sessionId,
        paperId,
        paperTitle: title,
        output: "",
        status: "extracting",
        minimized: false,
        hidden: false,
        createdAt: Date.now(),
      },
      ...current,
    ]);

    try {
      await streamExtractPaper(row, (chunk) => {
        streamBuffer += chunk;
        const { events, trailing } = parseSseBlocks(streamBuffer);
        streamBuffer = trailing;

        events.forEach((event) => {
          appendParsedEvent(event, sections);
        });

        const output = renderSections(sections);
        setSessions((current) =>
          updateSession(current, sessionId, (session) => ({
            ...session,
            output,
          })),
        );
      });

      if (streamBuffer.trim()) {
        const { events } = parseSseBlocks(`${streamBuffer}\n\n`);
        events.forEach((event) => {
          appendParsedEvent(event, sections);
        });
      }

      const finalOutput = renderSections(sections);

      setSessions((current) =>
        updateSession(current, sessionId, (session) => ({
          ...session,
          status: "success",
          output: finalOutput.trim()
            ? finalOutput
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
      restoreSession,
      expandSession,
      dismissSession,
      revealSessionByPaperId,
      closeExpandedSession,
    }),
    [
      sessions,
      expandedSessionId,
      startExtraction,
      minimizeSession,
      restoreSession,
      expandSession,
      dismissSession,
      revealSessionByPaperId,
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
  "grid h-6 w-6 place-items-center rounded-full border border-[#6a6a6a]/45 bg-white/[0.03] text-[#d8d8d8] transition-colors duration-150 ease-out hover:border-[#878787]/55 hover:bg-white/[0.06]";

function MinimizeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M3 8h10" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="9" height="7.5" rx="1.25" />
      <path d="M5.5 3.5h5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
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

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
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

const SCROLL_BOTTOM_THRESHOLD = 2;

const isAtBottom = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight - element.scrollTop <=
  SCROLL_BOTTOM_THRESHOLD;

export function ExtractionDock() {
  const {
    sessions,
    expandedSessionId,
    minimizeSession,
    restoreSession,
    expandSession,
    dismissSession,
    closeExpandedSession,
  } = useExtractionSession();

  const expandedSession =
    sessions.find((session) => session.id === expandedSessionId) ?? null;
  const visibleSessions = sessions.filter((session) => !session.hidden);
  const chipBodyRefs = useRef<Record<string, HTMLPreElement | null>>({});
  const chipAutoScrollRefs = useRef<Record<string, boolean>>({});
  const expandedBodyRef = useRef<HTMLPreElement | null>(null);
  const expandedAutoScrollRef = useRef(true);

  useEffect(() => {
    visibleSessions.forEach((session) => {
      if (session.minimized || session.status !== "extracting") return;
      const element = chipBodyRefs.current[session.id];
      if (!element) return;
      if (chipAutoScrollRefs.current[session.id] === false) return;
      element.scrollTop = element.scrollHeight;
    });
  }, [visibleSessions]);

  useEffect(() => {
    if (!expandedSession || expandedSession.status !== "extracting") return;
    const element = expandedBodyRef.current;
    if (!element || !expandedAutoScrollRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [expandedSession]);

  useEffect(() => {
    if (!expandedSessionId) {
      expandedAutoScrollRef.current = true;
      return;
    }

    const element = expandedBodyRef.current;
    if (!element) return;
    expandedAutoScrollRef.current = true;
    element.scrollTop = element.scrollHeight;
  }, [expandedSessionId]);

  if (!visibleSessions.length && !expandedSession) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto">
        {visibleSessions.map((session) => {
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
                <div className="flex gap-1.5">
                  {minimized ? (
                    <button
                      type="button"
                      onClick={() => restoreSession(session.id)}
                      className={iconButtonClass}
                      aria-label="Restore extraction panel"
                    >
                      <RestoreIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => minimizeSession(session.id)}
                      className={iconButtonClass}
                      aria-label="Minimize extraction panel"
                    >
                      <MinimizeIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => expandSession(session.id)}
                    className={iconButtonClass}
                    aria-label="Expand extraction panel"
                  >
                    <ExpandIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissSession(session.id)}
                    className={iconButtonClass}
                    aria-label="Dismiss extraction panel"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>

              {!minimized ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <pre
                    ref={(element) => {
                      if (!element) return;
                      chipBodyRefs.current[session.id] = element;
                      if (!(session.id in chipAutoScrollRefs.current)) {
                        chipAutoScrollRefs.current[session.id] = true;
                      }
                    }}
                    onScroll={(event) => {
                      chipAutoScrollRefs.current[session.id] = isAtBottom(
                        event.currentTarget,
                      );
                    }}
                    className={`no-scrollbar h-20 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#f7f3ea] ${
                      session.status === "extracting" ? "stream-breathe" : ""
                    }`}
                  >
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
                <pre
                  ref={expandedBodyRef}
                  onScroll={(event) => {
                    expandedAutoScrollRef.current = isAtBottom(
                      event.currentTarget,
                    );
                  }}
                  className={`h-full overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#f7f3ea] ${
                    expandedSession.status === "extracting"
                      ? "stream-breathe"
                      : ""
                  }`}
                >
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
