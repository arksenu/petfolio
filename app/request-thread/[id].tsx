import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useConcierge } from "@/lib/concierge-store";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { uploadAndTranscribeAudio } from "@/lib/voice-upload";
import { useAuth } from "@/hooks/use-auth";
import type { ConciergeMessage } from "@/shared/pet-types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function MessageBubble({
  message,
  colors,
}: {
  message: ConciergeMessage;
  colors: ReturnType<typeof useColors>;
}) {
  const isUser = message.senderType === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAgent, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}
      >
        {message.messageType === "voice" && (
          <View style={styles.voiceIndicator}>
            <IconSymbol
              name="waveform"
              size={16}
              color={isUser ? "#FFFFFF" : colors.primary}
            />
            <Text
              style={[
                styles.voiceDuration,
                { color: isUser ? "rgba(255,255,255,0.7)" : colors.muted },
              ]}
            >
              {message.audioDuration
                ? `${Math.ceil(message.audioDuration)}s`
                : "Voice"}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#FFFFFF" : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: isUser ? "rgba(255,255,255,0.6)" : colors.muted },
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function RequestThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, addMessage, getMessages } = useConcierge();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    isRecording,
    durationSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const request = state.requests.find((r) => r.id === id);
  const messages = getMessages(id || "");

  // Group messages by date
  const groupedMessages = useCallback(() => {
    const groups: Array<{ type: "header"; date: string } | { type: "message"; data: ConciergeMessage }> = [];
    let lastDate = "";

    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toDateString();
      if (date !== lastDate) {
        groups.push({ type: "header", date: msg.createdAt });
        lastDate = date;
      }
      groups.push({ type: "message", data: msg });
    });

    return groups;
  }, [messages])();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (groupedMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [groupedMessages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !id) return;
    addMessage(id, trimmed, "text");
    setText("");
  };

  const handleVoiceStop = async () => {
    const result = await stopRecording();
    if (!result || result.durationSeconds < 1 || !id) return;

    if (user) {
      setIsProcessingVoice(true);
      try {
        const { audioUrl, transcribedText } = await uploadAndTranscribeAudio(
          result.uri,
          result.mimeType,
          result.durationSeconds
        );
        addMessage(id, transcribedText, "voice", audioUrl, result.durationSeconds);
      } catch (e: any) {
        console.error("[RequestThread] Voice processing error:", e);
        addMessage(
          id,
          `[Voice message - ${result.durationSeconds}s] (transcription failed)`,
          "voice",
          undefined,
          result.durationSeconds
        );
      } finally {
        setIsProcessingVoice(false);
      }
    } else {
      addMessage(
        id,
        `[Voice message - ${result.durationSeconds}s]`,
        "voice",
        undefined,
        result.durationSeconds
      );
    }
  };

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Request not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (isRecording) cancelRecording();
            router.back();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {request.petName ? `${request.petName} Request` : "Request"}
          </Text>
          <Text style={[styles.headerStatus, { color: colors.muted }]}>
            {request.status === "active"
              ? "Active"
              : request.status === "in_progress"
              ? "In Progress"
              : request.status === "resolved"
              ? "Resolved"
              : "Cancelled"}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={(item, index) =>
            item.type === "header" ? `header-${index}` : `msg-${(item as any).data.id}`
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateHeaderText, { color: colors.muted }]}>
                    {formatDateHeader(item.date)}
                  </Text>
                </View>
              );
            }
            return <MessageBubble message={(item as any).data} colors={colors} />;
          }}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Send a message to get started
              </Text>
            </View>
          }
        />

        {/* Recording indicator */}
        {isRecording && (
          <View style={[styles.recordingBar, { backgroundColor: colors.error + "15" }]}>
            <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.recordingText, { color: colors.error }]}>
              Recording... {durationSeconds}s
            </Text>
            <Pressable
              onPress={cancelRecording}
              style={({ pressed }) => [
                styles.cancelRecordButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.cancelRecordText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* Processing voice indicator */}
        {isProcessingVoice && (
          <View style={[styles.recordingBar, { backgroundColor: colors.primary + "10" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.recordingText, { color: colors.primary }]}>
              Transcribing...
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          {/* Voice button */}
          <Pressable
            onPress={isRecording ? handleVoiceStop : startRecording}
            disabled={isProcessingVoice}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: isRecording ? colors.error + "20" : "transparent",
                opacity: pressed ? 0.6 : isProcessingVoice ? 0.3 : 1,
              },
            ]}
          >
            <IconSymbol
              name={isRecording ? "stop.fill" : "mic.fill"}
              size={22}
              color={isRecording ? colors.error : colors.primary}
            />
          </Pressable>

          {/* Text input */}
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            returnKeyType="default"
            editable={!isRecording && !isProcessingVoice}
          />

          {/* Send button */}
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || isRecording || isProcessingVoice}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: text.trim() ? colors.primary : colors.muted + "30",
                opacity: pressed && text.trim() ? 0.8 : 1,
              },
            ]}
          >
            <IconSymbol
              name="arrow.up.circle.fill"
              size={28}
              color={text.trim() ? "#FFFFFF" : colors.muted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bubbleRow: {
    marginBottom: 6,
    maxWidth: "80%",
  },
  bubbleRowRight: {
    alignSelf: "flex-end",
  },
  bubbleRowLeft: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  voiceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  voiceDuration: {
    fontSize: 12,
  },
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  cancelRecordButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelRecordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
  },
});
