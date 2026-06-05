"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * useChatStream — hook untuk handle streaming chat ke /api/v1/chat
 *
 * @returns {object} { messages, isStreaming, sendMessage, setMessages, resetMessages }
 */
export function useChatStream() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);

  const appendToLastMessage = useCallback((chunk) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (!lastMsg || lastMsg.role !== "assistant") return prev;
      updated[updated.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + chunk,
      };
      return updated;
    });
  }, []);

  const appendToLastMessageThink = useCallback((chunk) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (!lastMsg || lastMsg.role !== "assistant") return prev;

      updated[updated.length - 1] = {
        ...lastMsg,
        think: (lastMsg.think || "") + chunk,
      };

      return updated;
    });
  }, []);

  const appendToLastMessageThinkDuration = useCallback((chunk) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (!lastMsg || lastMsg.role !== "assistant") return prev;

      updated[updated.length - 1] = {
        ...lastMsg,
        think_duration: (lastMsg.think_duration || 0) + chunk,
      };

      return updated;
    });
  }, []);

  /**
   * Kirim pesan dan stream response dari AI
   * @param {string} message - pesan user
   * @param {string} chatId - chat session ID
   */
  const sendMessage = useCallback(
    async (message, chatId, thinking) => {
      // Cancel any previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Optimistic update: tambah user message + placeholder assistant
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: "", think: "" },
      ]);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            chat: message,
            chat_id: chatId,
            is_think_mode: thinking,
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.push("/login?expired=true");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Streaming not supported by this browser/server");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          // Also check signal inside the read loop
          if (controller.signal.aborted) break;
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Support SSE format: "data: {...}" dan raw NDJSON
            const jsonStr = trimmed.startsWith("data:")
              ? trimmed.slice(5).trim()
              : trimmed;

            if (jsonStr === "[DONE]") break;

            try {
              const json = JSON.parse(jsonStr);
              const is_think_mode = json?.is_thinking;
              const content = json.message?.content || "";
              const think_duration = json?.think_duration;

              if (think_duration)
                appendToLastMessageThinkDuration(think_duration);
              if (is_think_mode) {
                appendToLastMessageThink(content);
              } else {
                appendToLastMessage(content);
              }
            } catch {
              // Bukan JSON valid, skip
            }
          }
        }

        // Flush sisa buffer
        if (buffer.trim() && buffer.trim() !== "[DONE]") {
          const jsonStr = buffer.trim().startsWith("data:")
            ? buffer.trim().slice(5).trim()
            : buffer.trim();
          try {
            const json = JSON.parse(jsonStr);
            const content =
              json.message?.content ||
              json.choices?.[0]?.delta?.content ||
              json.content ||
              "";
            if (content) appendToLastMessage(content);
          } catch {
            // skip
          }
        }
      } catch (error) {
        // AbortError = intentional cancellation, not a real error
        if (error?.name === "AbortError") {
          // Remove empty assistant placeholder on abort
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              updated.pop();
            }
            return updated;
          });
        } else {
          console.error("Streaming error:", error);
          toast.error("Unexpected error happened, please try again");
          // Hapus placeholder assistant jika error
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && last.content === "") {
              updated.pop();
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [appendToLastMessage, appendToLastMessageThink],
  );

  const resetMessages = useCallback(() => setMessages([]), []);

  /** Aborts the current in-flight fetch + stream reader */
  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStream,
    setMessages,
    resetMessages,
  };
}
