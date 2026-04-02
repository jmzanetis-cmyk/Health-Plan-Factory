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
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { interceptEmergencyText } from "@/lib/emergencyCheck";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const SUGGESTION_CHIPS = [
  "How am I doing this week?",
  "Tips to stay consistent",
  "Explain my plan items",
  "Help me build a morning routine",
];

const OPENING_MESSAGE: Message = {
  id: "opening",
  role: "assistant",
  content:
    "Hey! I'm your HealthPlanFactory accountability coach. I'm here to help you stay on track, answer questions about your wellness plan, and celebrate your wins.\n\nWhat's on your mind today?",
};

const STORAGE_KEY = "hpf_coach_messages_v2";
const MAX_STORED_MESSAGES = 30;

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View
      style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}
    >
      {!isUser && (
        <View style={styles.avatarDot}>
          <Feather name="cpu" size={12} color={COLORS.white} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
          {message.isStreaming && (
            <Text style={styles.cursor}>▋</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

function MemoryBadge({ sessionCount }: { sessionCount: number }) {
  if (sessionCount === 0) return null;
  return (
    <View style={styles.memoryBadge}>
      <Feather name="zap" size={10} color={COLORS.purple} />
      <Text style={styles.memoryBadgeText}>
        Memory active · {sessionCount} session{sessionCount !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { getToken } = useAuth();
  const { data: authData } = useGetCurrentAuthUser();

  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [memorySessionCount, setMemorySessionCount] = useState(0);
  const messagesRef = useRef<Message[]>([OPENING_MESSAGE]);
  const saveMemoryRef = useRef<NodeJS.Timeout | null>(null);

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
        .filter((m) => !m.isStreaming)
        .slice(-MAX_STORED_MESSAGES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storable));
    } catch {
      // Storage failure is non-fatal
    }
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

  async function saveSessionMemory(msgs: Message[]) {
    try {
      const meaningful = msgs.filter(
        (m) => m.id !== "opening" && !m.isStreaming && m.content.length > 5
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
    } catch {
      // Non-fatal — memory save failure doesn't break the chat
    }
  }

  // Load stored messages on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const restored = parsed.filter((m) => !m.isStreaming);
            const withWelcome = [OPENING_MESSAGE, ...restored.filter((m) => m.id !== "opening")];
            messagesRef.current = withWelcome;
            setMessages(withWelcome);
          }
        }

        const sessionCount = await loadServerMemory();
        setMemorySessionCount(sessionCount);
      } catch {
        // Silently continue with defaults
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
              .filter((m) => m.id !== "opening")
              .map((m) => ({ role: m.role, content: m.content })),
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
                    m.id === assistantId
                      ? { ...m, content: accumulated }
                      : m
                  )
                );
              } else if (parsed.type === "done" || parsed.type === "error") {
                streamDone = true;
                break;
              }
            } catch {
              // skip malformed frames
            }
          }
        }

        if (lineBuffer.trim().startsWith("data: ")) {
          const json = lineBuffer.trim().slice(6).trim();
          if (json && json !== "[DONE]") {
            try {
              const parsed = JSON.parse(json);
              if (parsed.type === "text" && typeof parsed.text === "string") {
                accumulated += parsed.text;
              }
            } catch {}
          }
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
            ? {
                ...m,
                content:
                  "I'm having trouble connecting right now. Please try again in a moment.",
                isStreaming: false,
              }
            : m
        );
        messagesRef.current = errorMessages;
        setMessages([...errorMessages]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, getToken, scheduleMemorySave]
  );

  const reversedMessages = [...messages].reverse();

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
            <Text style={styles.headerTitle}>AI Coach</Text>
            <Text style={styles.headerSub}>Powered by Claude</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <MemoryBadge sessionCount={memorySessionCount} />
          <View style={styles.onlineIndicator} />
        </View>
      </View>

      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.purple} size="small" />
          <Text style={styles.loadingText}>Restoring your conversation…</Text>
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
            placeholder="Ask your coach..."
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

        <Text style={styles.disclaimer}>
          Not medical advice. For emergencies, call 911 or text 988.
        </Text>
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
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.navy,
  },
  headerSub: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.sage,
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
  memoryBadgeText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.purple,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
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
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.navy,
    lineHeight: 20,
  },
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.warm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  chipsRow: { marginBottom: 4 },
  chipsContent: { gap: SPACING.sm, paddingVertical: 2 },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.navy,
  },
  inputRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  disclaimer: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
