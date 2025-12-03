"use client";

import { useState, useCallback } from "react";
import {
  useAIChats,
  useCreateAIChat,
  useUpdateAIChat,
  useDeleteAIChat,
} from "../services/useAIChats";
import {
  AI_MODELS,
  type AIModelValue,
} from "@/modules/ai/components/AIModelSelector";

/**
 * Hook for managing AI chat functionality
 * This hook encapsulates all AI chat state and operations
 */
export function useAIChat(workspaceId: string) {
  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem("userId") || "user-001"
      : "user-001";

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModelValue>(
    AI_MODELS[0].value
  );

  const { data: chats = [] } = useAIChats(userId, workspaceId);
  const createChatMutation = useCreateAIChat();
  const updateChatMutation = useUpdateAIChat();
  const deleteChatMutation = useDeleteAIChat();

  const createChat = useCallback(async () => {
    const newChat = await createChatMutation.mutateAsync({
      userId,
      workspaceId,
      title: "Nova Conversa",
      messages: [],
    });
    setCurrentChatId(newChat.id);
    return newChat;
  }, [userId, workspaceId, createChatMutation]);

  const updateChat = useCallback(
    async (
      chatId: string,
      updates: { title?: string; messages?: unknown[] }
    ) => {
      await updateChatMutation.mutateAsync({
        id: chatId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: updates as any,
      });
    },
    [updateChatMutation]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      await deleteChatMutation.mutateAsync(chatId);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
    },
    [currentChatId, deleteChatMutation]
  );

  return {
    chats,
    currentChatId,
    setCurrentChatId,
    selectedModel,
    setSelectedModel,
    createChat,
    updateChat,
    deleteChat,
  };
}
