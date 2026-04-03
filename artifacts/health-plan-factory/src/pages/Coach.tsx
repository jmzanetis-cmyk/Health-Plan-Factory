import { useState, useRef, useCallback, useEffect } from "react";
import { Bot, Send, RefreshCw, Zap } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Message {
  id: string;
  role: "user" | "assistant" | "separator";
  content: string;
  isStreaming?: boolean;
}

const OPENING_MESSAGE: Message = {
  id: "opening",
  role: "assistant",
  content:
    "Hey! I'm your HealthPlanFactory accountability coach. I'm here to help you stay on track, answer questions about your wellness plan, and celebrate your wins.\n\nWhat's on your mind today?",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "separator") {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t" style={{ borderColor: "rgba(212,34,126,0.12)" }} />
        <span className="text-xs px-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          {message.content}
        </span>
        <div className="flex-1 border-t" style={{ borderColor: "rgba(212,34,126,0.12)" }} />
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "var(--hpf-pink)" }}
        >
          <Bot size={14} color="white" />
        </div>
      )}
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? {
                background: "var(--hpf-pink)",
                color: "white",
                fontFamily: "var(--app-font-sans)",
                borderBottomRightRadius: 4,
              }
            : {
                background: "white",
                border: "1px solid rgba(212,34,126,0.1)",
                color: "var(--hpf-deep)",
                fontFamily: "var(--app-font-sans)",
                borderBottomLeftRadius: 4,
              }
        }
      >
        {message.content}
        {message.isStreaming && (
          <span className="inline-block ml-0.5 animate-pulse" style={{ color: "var(--hpf-pink)" }}>
            ▋
          </span>
        )}
      </div>
    </div>
  );
}

export default function Coach() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const SUGGESTION_CHIPS = t("coach.suggestions", { returnObjects: true }) as string[];
  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [memorySessionCount, setMemorySessionCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const messagesRef = useRef<Message[]>([OPENING_MESSAGE]);
  const saveMemoryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function loadServerMemory(): Promise<number> {
    try {
      const res = await fetch(`${BASE}/api/coach/memory`, { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.sessionCount ?? 0;
    } catch {
      return 0;
    }
  }

  async function loadServerSession(): Promise<{
    sessionId: number | null;
    messages: Message[];
    sessionStartedAt: string | null;
  }> {
    try {
      const res = await fetch(`${BASE}/api/coach/session`, { credentials: "include" });
      if (!res.ok) return { sessionId: null, messages: [], sessionStartedAt: null };
      const data = await res.json();
      return {
        sessionId: data.sessionId ?? null,
        messages: Array.isArray(data.messages) ? data.messages : [],
        sessionStartedAt: data.sessionStartedAt ?? null,
      };
    } catch {
      return { sessionId: null, messages: [], sessionStartedAt: null };
    }
  }

  async function saveSessionMemory(msgs: Message[]) {
    try {
      const meaningful = msgs.filter(
        (m) => m.id !== "opening" && !m.isStreaming && m.role !== "separator" && m.content.length > 5
      );
      if (meaningful.length < 2) return;
      await fetch(`${BASE}/api/coach/memory`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: meaningful.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setMemorySessionCount((c) => c + 1);
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { sessionId: serverId, messages: serverMsgs, sessionStartedAt } = await loadServerSession();
        if (serverMsgs.length > 0) {
          setCurrentSessionId(serverId);
          const dateLabel = sessionStartedAt
            ? `Continuing from ${formatSessionDate(sessionStartedAt)}`
            : "Continuing from a previous session";
          const separator: Message = { id: "separator-server", role: "separator", content: dateLabel };
          const restored = serverMsgs.map((m: Message) => ({ ...m, isStreaming: false }));
          const withWelcome = [OPENING_MESSAGE, separator, ...restored.filter((m: Message) => m.id !== "opening")];
          messagesRef.current = withWelcome;
          setMessages(withWelcome);
        }
        const sessionCount = await loadServerMemory();
        setMemorySessionCount(sessionCount);
      } catch {
        // Continue with defaults
      } finally {
        setIsLoadingHistory(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scheduleMemorySave = useCallback(() => {
    if (saveMemoryRef.current) clearTimeout(saveMemoryRef.current);
    saveMemoryRef.current = setTimeout(() => {
      saveSessionMemory(messagesRef.current);
    }, 3000);
  }, []);

  async function handleNewConversation() {
    if (!confirm("This will clear your current chat history. Your coach memory (goals, preferences) is preserved. Continue?")) return;
    setIsResetting(true);
    try {
      const url = currentSessionId
        ? `${BASE}/api/coach/session?sessionId=${currentSessionId}`
        : `${BASE}/api/coach/session`;
      await fetch(url, { method: "DELETE", credentials: "include" }).catch(() => {});
    } catch {
      // Non-fatal
    } finally {
      messagesRef.current = [OPENING_MESSAGE];
      setMessages([OPENING_MESSAGE]);
      setCurrentSessionId(null);
      setIsResetting(false);
    }
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setInput("");
      setIsSending(true);

      const userMsg: Message = { id: genId(), role: "user", content: trimmed };
      const currentMessages = [...messagesRef.current, userMsg];
      messagesRef.current = currentMessages;
      setMessages([...currentMessages]);

      const assistantId = genId();
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", isStreaming: true };
      const withAssistant = [...currentMessages, assistantMsg];
      messagesRef.current = withAssistant;
      setMessages([...withAssistant]);

      try {
        const res = await fetch(`${BASE}/api/coach`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages
              .filter((m) => m.id !== "opening" && m.role !== "separator")
              .map((m) => ({ id: m.id, role: m.role, content: m.content })),
            ...(currentSessionId ? { sessionId: currentSessionId } : {}),
          }),
        });

        if (!res.ok || !res.body) throw new Error("Coach unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let lineBuffer = "";
        let streamDone = false;
        let serverSessionId: number | null = null;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            const json = trimmedLine.slice(6).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              if (parsed.type === "text" && typeof parsed.text === "string") {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
                );
              } else if (parsed.type === "done") {
                if (parsed.sessionId) serverSessionId = parsed.sessionId;
                streamDone = true;
                break;
              } else if (parsed.type === "error") {
                streamDone = true;
                break;
              }
            } catch {
              // Skip malformed frames
            }
          }
        }

        // Flush any remaining data in lineBuffer after stream ends
        if (lineBuffer.trim().startsWith("data: ")) {
          const json = lineBuffer.trim().slice(6).trim();
          if (json && json !== "[DONE]") {
            try {
              const parsed = JSON.parse(json);
              if (parsed.type === "text" && typeof parsed.text === "string") {
                accumulated += parsed.text;
              } else if (parsed.type === "done" && parsed.sessionId) {
                serverSessionId = parsed.sessionId;
              }
            } catch {
              // Skip malformed trailing frame
            }
          }
        }

        if (serverSessionId) setCurrentSessionId(serverSessionId);

        const finalMessages = messagesRef.current.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated, isStreaming: false } : m
        );
        messagesRef.current = finalMessages;
        setMessages([...finalMessages]);
        scheduleMemorySave();
      } catch {
        const errorMessages = messagesRef.current.map((m) =>
          m.id === assistantId
            ? { ...m, content: "I'm having trouble connecting right now. Please try again in a moment.", isStreaming: false }
            : m
        );
        messagesRef.current = errorMessages;
        setMessages([...errorMessages]);
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [isSending, scheduleMemorySave, currentSessionId]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--hpf-pink)" }} />
      </div>
    );
  }

  const hasHistory = messages.length > 1;

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--warm-white)",
        height: "calc(100vh - 84px)",
        maxHeight: "calc(100vh - 84px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ background: "white", borderColor: "rgba(212,34,126,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--hpf-pink) 0%, var(--hpf-crimson) 100%)" }}
          >
            <Bot size={18} color="white" />
          </div>
          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-deep)" }}
            >
              {t("coach.title")}
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("coach.poweredBy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {memorySessionCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "rgba(212,34,126,0.08)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <Zap size={11} />
              {t("coach.memoryActive", { count: memorySessionCount })}
            </div>
          )}
          {hasHistory && !isLoadingHistory && (
            <button
              onClick={handleNewConversation}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50"
              style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(212,34,126,0.1)" }}
            >
              <RefreshCw size={12} />
              {t("coach.newChat")}
            </button>
          )}
          <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
        </div>
      </div>

      {/* Crisis disclaimer */}
      <div
        className="px-4 py-2 text-xs text-center flex-shrink-0"
        style={{ background: "rgba(224,32,64,0.04)", borderBottom: "1px solid rgba(224,32,64,0.1)", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
      >
        {t("coach.disclaimer")}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={20} style={{ color: "var(--hpf-pink)" }} />
            <p className="text-sm" style={{ fontFamily: "var(--app-font-sans)" }}>{t("coach.restoring")}</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Suggestion chips — shown only when no history */}
      {!isLoadingHistory && messages.length === 1 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                disabled={isSending}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: "white",
                  border: "1px solid rgba(212,34,126,0.2)",
                  color: "var(--hpf-pink)",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className="flex-shrink-0 border-t px-4 py-3"
        style={{ background: "white", borderColor: "rgba(212,34,126,0.1)" }}
      >
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach anything…"
            rows={1}
            disabled={isSending || isLoadingHistory}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: "var(--warm-white)",
              border: "1px solid rgba(212,34,126,0.15)",
              fontFamily: "var(--app-font-sans)",
              color: "var(--hpf-deep)",
              maxHeight: 120,
              lineHeight: 1.5,
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isSending || !input.trim() || isLoadingHistory}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: "var(--hpf-pink)" }}
          >
            {isSending ? (
              <Loader2 size={16} color="white" className="animate-spin" />
            ) : (
              <Send size={16} color="white" />
            )}
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
