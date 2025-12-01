import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/services/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  rawResponse?: string;
  fullResponse?: Record<string, unknown>;
}

interface Chat {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface CreateChatDto {
  userId: string;
  workspaceId: string;
  title: string;
  messages: Message[];
}

interface UpdateChatDto {
  title?: string;
  messages?: Message[];
}

// Query keys
export const aiChatKeys = {
  all: ["ai-chats"] as const,
  lists: () => [...aiChatKeys.all, "list"] as const,
  list: (userId: string, workspaceId: string) =>
    [...aiChatKeys.lists(), userId, workspaceId] as const,
  details: () => [...aiChatKeys.all, "detail"] as const,
  detail: (id: string) => [...aiChatKeys.details(), id] as const,
};

// Fetch chats
export function useAIChats(userId: string, workspaceId: string) {
  return useQuery({
    queryKey: aiChatKeys.list(userId, workspaceId),
    queryFn: async () => {
      const response = await apiRequest<Chat[]>(
        `/ai/chats?userId=${userId}&workspaceId=${workspaceId}`
      );
      return Array.isArray(response) ? response : [];
    },
    enabled: !!userId && !!workspaceId,
  });
}

// Create chat mutation
export function useCreateAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChatDto) => {
      return apiRequest<Chat>("/ai/chats", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch chats list
      queryClient.invalidateQueries({
        queryKey: aiChatKeys.lists(),
      });
    },
  });
}

// Update chat mutation
export function useUpdateAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChatDto }) => {
      return apiRequest<Chat>(`/ai/chats/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch chats list
      queryClient.invalidateQueries({
        queryKey: aiChatKeys.lists(),
      });
      // Also invalidate the specific chat detail
      queryClient.invalidateQueries({
        queryKey: aiChatKeys.detail(variables.id),
      });
    },
  });
}

// Delete chat mutation
export function useDeleteAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/ai/chats/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch chats list
      queryClient.invalidateQueries({
        queryKey: aiChatKeys.lists(),
      });
    },
  });
}

// Generate AI response mutation
interface GenerateAIDto {
  topic: string;
  workspaceId: string;
  userId: string;
}

interface GenerateAIResponse {
  success: boolean;
  rawResponse?: string;
  fullResponse?: Record<string, unknown>;
  message?: string;
}

export function useGenerateAI() {
  return useMutation({
    mutationFn: async (data: GenerateAIDto): Promise<GenerateAIResponse> => {
      return apiRequest<GenerateAIResponse>("/ai/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });
}
