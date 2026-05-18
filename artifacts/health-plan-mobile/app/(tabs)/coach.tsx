import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { interceptEmergencyText } from "@/lib/emergencyCheck";
import { getApiBaseUrl } from "@/lib/apiBase";
import { PlusPaywall } from "@/components/PlusPaywall";
import { usePlusAccess } from "@/lib/subscription";

interface Message {
  id: string;
  role: "user" | "assistant" | "separator";
  content: string;
  isStreaming?: boolean;
}

const STORAGE_KEY = "hpf_coach_messages_v2";
const MAX_STORED_MESSAGES = 30;

function formatSessionDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  const locale = lang === "es" ? "es-MX" : "en-US";
  if (diffDays === 0) return lang === "es" ? "hoy" : "today";
  if (diffDays === 1) return lang === "es" ? "ayer" : "yesterday";
  if (diffDays < 7) return lang === "es" ? `hace ${diffDays} días` : `${diffDays} days ago`;
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "separator") {
    return (
      <View style={styles.separatorRow}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>{message.content}</Text>
        <View style={styles.separatorLine} />
      </View>
    );
  }

  const isUser = message.role === "user";
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      {!isUser && (
        <View style={styles.avatarDot}>
          <Feather name="cpu" size={12} color={COLORS.white} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
          {message.isStreaming && <Text style={styles.cursor}>▋</Text>}
        </Text>
      </View>
    </View>
  );
}

function MemoryBadge({ sessionCount, label }: { sessionCount: number; label: string }) {
  if (sessionCount === 0) return null;
  return (
    <View style={styles.memoryBadge}>
      <Feather name="zap" size={10} color={COLORS.purple} />
      <Text style={styles.memoryBadgeText}>{label}</Text>
    </View>
  );
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { getToken } = useAuth();
  const { isPlus, loading: plusLoading } = usePlusAccess();
  const { data: authData } = useGetCurrentAuthUser();
  const { t, i18n } = useTranslation();

  const SUGGESTION_CHIPS = [
    t("coach.chip1"),
    t("coach.chip2"),
    t("coach.chip3"),
    t("coach.chip4"),
  ];

  const OPENING_MESSAGE: Message = {
    id: "opening",
    role: "assistant",
    content: t("coach.openingMessage"),
  };

  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [memorySessionCount, setMemorySessionCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const messagesRef = useRef<Message[]>([OPENING_MESSAGE]);
  const saveMemoryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function genId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = await getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  async function persistMessages(msgs: Message[]) {
    try {
      const storable = msgs
        .filter((m) => !m.isStreaming && m.role !== "separator")
        .slice(-MAX_STORED_MESSAGES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storable));
    } catch {}
  }

  async function loadServerMemory(): Promise<number> {
    try {
      const apiBase = getApiBaseUrl();
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return 0;
      const res = await fetch(`${apiBase}/api/coach/memory`, {
        headers: { "Content-Type": "application/json", ...headers },
      });
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
      const apiBase = getApiBaseUrl();
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return { sessionId: null, messages: [], sessionStartedAt: null };
      const res = await fetch(`${apiBase}/api/coach/session`, {
        headers: { "Content-Type": "application/json", ...headers },
      });
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
      const apiBase = getApiBaseUrl();
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`${apiBase}/api/coach/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          messages: meaningful.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setMemorySessionCount((c) => c + 1);
    } catch {}
  }

  useEffect(() => {
    async function load() {
      try {
        const { sessionId: serverId, messages: serverMsgs, sessionStartedAt } = await loadServerSession();

        if (serverMsgs.length > 0) {
          setCurrentSessionId(serverId);
          const dateLabel = sessionStartedAt
            ? t("coach.continuingFrom", { date: formatSessionDate(sessionStartedAt, i18n.language) })
            : t("coach.continuingFromPrevious");
          const separator: Message = {
            id: "separator-server",
            role: "separator",
            content: dateLabel,
          };
          const restored = serverMsgs.map((m: Message) => ({ ...m, isStreaming: false }));
          const withWelcome = [OPENING_MESSAGE, separator, ...restored.filter((m: Message) => m.id !== "opening")];
          messagesRef.current = withWelcome;
          setMessages(withWelcome);
        } else {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed: Message[] = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const restored = parsed.filter((m) => !m.isStreaming && m.role !== "separator");
              const withWelcome = [OPENING_MESSAGE, ...restored.filter((m) => m.id !== "opening")];
              messagesRef.current = withWelcome;
              setMessages(withWelcome);
            }
          }
        }

        const sessionCount = await loadServerMemory();
        setMemorySessionCount(sessionCount);
      } catch {
      } finally {
        setIsLoadingHistory(false);
      }
    }
    load();
  }, []);

  const scheduleMemorySave = useCallback(() => {
    if (saveMemoryRef.current) clearTimeout(saveMemoryRef.current);
    saveMemoryRef.current = setTimeout(() => {
      saveSessionMemory(messagesRef.current);
    }, 3000);
  }, []);

  async function handleNewConversation() {
    Alert.alert(
      t("coach.newConversationTitle"),
      t("coach.newConversationBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("coach.startFresh"),
          style: "destructive",
          onPress: async () => {
            setIsResetting(true);
            try {
              const apiBase = getApiBaseUrl();
              const headers = await getAuthHeaders();
              if (headers.Authorization) {
                const url = currentSessionId
                  ? `${apiBase}/api/coach/session?sessionId=${currentSessionId}`
                  : `${apiBase}/api/coach/session`;
                await fetch(url, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json", ...headers },
                }).catch(() => {});
              }
              await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
            } catch {
            } finally {
              messagesRef.current = [OPENING_MESSAGE];
              setMessages([OPENING_MESSAGE]);
              setCurrentSessionId(null);
              setIsResetting(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInput("");
      setIsSending(true);

      const userMsg: Message = { id: genId(), role: "user", content: trimmed };
      const currentMessages = [...messagesRef.current, userMsg];
      messagesRef.current = currentMessages;
      setMessages([...currentMessages]);

      const assistantId = genId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };
      const withAssistant = [...currentMessages, assistantMsg];
      messagesRef.current = withAssistant;
      setMessages([...withAssistant]);

      try {
        const token = await getToken();
        const apiBase = getApiBaseUrl();

        const res = await fetch(`${apiBase}/api/coach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: currentMessages
              .filter((m) => m.id !== "opening" && m.role !== "separator")
              .map((m) => ({ id: m.id, role: m.role, content: m.content })),
            ...(currentSessionId ? { sessionId: currentSessionId } : {}),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Coach unavailable");
        }

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
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              } else if (parsed.type === "done") {
                if (parsed.sessionId) serverSessionId = parsed.sessionId;
                streamDone = true;
                break;
              } else if (parsed.type === "error") {
                streamDone = true;
                break;
              }
            } catch {}
          }
        }

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
            } catch {}
          }
        }

        if (serverSessionId) {
          setCurrentSessionId(serverSessionId);
        }

        const finalMessages = messagesRef.current.map((m) =>
          m.id === assistantId
            ? { ...m, content: accumulated, isStreaming: false }
            : m
        );
        messagesRef.current = finalMessages;
        setMessages([...finalMessages]);

        await persistMessages(finalMessages);
        scheduleMemorySave();
      } catch {
        const errorMessages = messagesRef.current.map((m) =>
          m.id === assistantId
            ? { ...m, content: t("coach.connectionError"), isStreaming: false }
            : m
        );
        messagesRef.current = errorMessages;
        setMessages([...errorMessages]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, getToken, scheduleMemorySave, currentSessionId, t]
  );

  if (plusLoading) return (
    <View style={{ flex: 1, backgroundColor: COLORS.warm, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={COLORS.purple} />
    </View>
  );
  if (!isPlus) return <PlusPaywall feature="coach" />;

  const hasHistory = messages.length > 1;
  const reversedMessages = [...messages].reverse();

  const memoryLabel = t("coach.memoryActive", { count: memorySessionCount });

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: topPad }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.coachAvatar}>
            <Feather name="cpu" size={16} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t("coach.title")}</Text>
            <Text style={styles.headerSub}>{t("coach.poweredBy")}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <MemoryBadge sessionCount={memorySessionCount} label={memoryLabel} />
          {hasHistory && !isLoadingHistory && (
            <TouchableOpacity
              style={styles.newConvoBtn}
              onPress={handleNewConversation}
              disabled={isResetting}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={13} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          <View style={styles.onlineIndicator} />
        </View>
      </View>

      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.purple} size="small" />
          <Text style={styles.loadingText}>{t("coach.restoringConversation")}</Text>
        </View>
      ) : (
        <FlatList
          data={reversedMessages}
          keyExtractor={(m) => m.id}
          inverted
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isSending && reversedMessages[0]?.isStreaming !== true ? (
              <View style={styles.typingRow}>
                <View style={styles.avatarDot}>
                  <Feather name="cpu" size={12} color={COLORS.white} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator color={COLORS.purple} size="small" />
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View style={[styles.inputArea, { paddingBottom: botPad + SPACING.md }]}>
        <View style={styles.chipsRow}>
          <FlatList
            data={SUGGESTION_CHIPS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item: chip }) => (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => sendMessage(chip)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t("coach.inputPlaceholder")}
            placeholderTextColor={COLORS.textLight}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              interceptEmergencyText(text);
            }}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isSending}
            activeOpacity={0.85}
          >
            <Feather name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>{t("coach.disclaimer")}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.warm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  headerRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.navy },
  headerSub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.sage,
  },
  newConvoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(124,58,237,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.15)",
  },
  memoryBadgeText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.purple },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loadingText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  separatorText: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, flexShrink: 1 },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowAssistant: { justifyContent: "flex-start" },
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  bubbleUser: {
    backgroundColor: COLORS.navy,
    borderBottomRightRadius: RADIUS.xs,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.navy, lineHeight: 21 },
  bubbleTextUser: { color: COLORS.white },
  cursor: { color: COLORS.purple },
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typingBubble: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.xs,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.warm,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  chipsRow: { marginHorizontal: -SPACING.sm },
  chipsContent: { paddingHorizontal: SPACING.sm, gap: SPACING.sm },
  chip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.navy10,
    borderWidth: 1,
    borderColor: COLORS.navy20,
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.navy,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  disclaimer: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 14,
  },
});
