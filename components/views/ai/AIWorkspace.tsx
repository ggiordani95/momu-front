"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Search,
  Settings,
  Paperclip,
  Link as LinkIcon,
  Mic,
  Pencil,
  Trash2,
  Airplay,
} from "lucide-react";
import { JSONViewer } from "./JSONViewer";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  useAIChats,
  useCreateAIChat,
  useUpdateAIChat,
  useDeleteAIChat,
} from "@/lib/hooks/querys/useAIChats";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  rawResponse?: string;
  fullResponse?: Record<string, unknown>;
}

interface AIWorkspaceProps {
  workspaceId: string;
}

export function AIWorkspace({ workspaceId }: AIWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get userId
  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem("userId") || "user-001"
      : "user-001";

  // React Query hooks
  const { data: chats = [] } = useAIChats(userId, workspaceId);
  const createChatMutation = useCreateAIChat();
  const updateChatMutation = useUpdateAIChat();
  const deleteChatMutation = useDeleteAIChat();

  // Save messages to database whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const title =
        messages.find((m) => m.role === "user")?.content.substring(0, 50) ||
        "New Chat";

      if (currentChatId) {
        // Update existing chat
        updateChatMutation.mutate({
          id: currentChatId,
          data: {
            messages: messages.map((m) => ({
              ...m,
              timestamp: m.timestamp.toISOString(),
            })),
          },
        });
      } else {
        // Create new chat
        createChatMutation.mutate(
          {
            userId,
            workspaceId,
            title,
            messages: messages.map((m) => ({
              ...m,
              timestamp: m.timestamp.toISOString(),
            })),
          },
          {
            onSuccess: (newChat) => {
              setCurrentChatId(newChat.id);
            },
          }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentChatId, userId, workspaceId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearHistory = () => {
    if (confirm("Tem certeza que deseja limpar o histórico de conversas?")) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const loadChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chat.id);
      setMessages(
        (chat.messages as unknown[]).map((m) => {
          const msg = m as Record<string, unknown>;
          return {
            ...msg,
            timestamp: new Date(msg.timestamp as string),
          } as Message;
        })
      );
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja deletar este chat?")) {
      deleteChatMutation.mutate(chatId, {
        onSuccess: () => {
          if (currentChatId === chatId) {
            setMessages([]);
            setCurrentChatId(null);
          }
        },
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      // Get userId from localStorage
      const userId =
        typeof window !== "undefined"
          ? localStorage.getItem("userId") || "user-001"
          : "user-001";

      // Call AI endpoint
      const response = await fetch("http://localhost:3001/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: userMessage.content,
          workspaceId,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate content");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("No response from AI");
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.rawResponse || "Resposta recebida da IA",
        timestamp: new Date(),
        rawResponse: data.rawResponse,
        fullResponse: data.fullResponse,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `❌ Erro ao gerar estrutura: ${
          err instanceof Error ? err.message : "Erro desconhecido"
        }`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get the last assistant message with response data
  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant" && m.fullResponse)
    .pop();

  return (
    <div className="h-full flex bg-background">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className="w-64 border-r border-border bg-background flex flex-col"
      >
        {/* New Chat Button */}
        <div className="p-3 border-b border-border">
          <button
            onClick={clearHistory}
            className="w-full flex items-center gap-2 px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg transition-colors text-sm font-medium"
          >
            <Pencil className="w-5 h-5" />
            <span className="text-base">New Chat</span>
            <span className="ml-auto text-sm text-foreground/40">⌘ /</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-foreground/5 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto p-4">
          {chats.length === 0 ? (
            <div className="text-center text-sm text-foreground/40 mt-8">
              No matching rooms
            </div>
          ) : (
            <div className="space-y-1">
              {Array.isArray(chats) &&
                chats
                  .filter((chat) =>
                    chat.title
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`group px-4 py-3.5 rounded-lg hover:bg-foreground/5 cursor-pointer text-base text-foreground/70 truncate flex items-center justify-between ${
                        currentChatId === chat.id ? "bg-foreground/5" : ""
                      }`}
                    >
                      <span className="truncate flex-1">{chat.title}</span>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-foreground/10 rounded transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-foreground/40" />
                      </button>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-6 text-base text-foreground/60">
            <button className="text-foreground font-medium">Bate-papo</button>
            <button className="hover:text-foreground transition-colors">
              Como fazer
            </button>
          </div>
        </div>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="text-center font-medium text-foreground/40 text-xl">
                Comece uma nova conversa.
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-8 space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user"
                      ? "justify-end items-start"
                      : "justify-start items-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center shrink-0 border border-border">
                      <Airplay className="w-5 h-5 text-foreground/50" />
                    </div>
                  )}
                  <div
                    className={`flex-1 max-w-[75%] ${
                      message.role === "user" ? "order-first" : ""
                    }`}
                  >
                    <div
                      className={`${
                        message.role === "user"
                          ? "text-foreground"
                          : "bg-foreground/5 text-foreground border border-border/50 rounded-lg p-5"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="text-base leading-relaxed text-end whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <MarkdownRenderer
                          content={message.content}
                          className="text-base leading-relaxed"
                        />
                      )}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center shrink-0 border border-border">
                      <span className="text-sm font-medium text-foreground/60">
                        V
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-4 justify-start items-start">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center shrink-0 border border-border">
                    <Sparkles className="w-5 h-5 text-foreground/50" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-foreground/5 rounded-lg p-5 border border-border/50">
                      <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* JSON Viewer - Below chat with scroll */}
        {/* {lastAssistantMessage?.fullResponse && (
          <div className="border-t border-border bg-background max-h-64 overflow-y-auto">
            <JSONViewer
              data={lastAssistantMessage.fullResponse}
              title="Resposta Completa da API"
            />
          </div>
        )} */}

        {/* Input Area */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-4xl mx-auto p-6">
            {/* Suggested Prompts (when no messages) */}

            {/* Main Input Container */}
            <div className="relative bg-foreground/5 border border-border rounded-xl p-6">
              {/* Main Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Comece pedindo sobre algo..."
                className="w-full bg-transparent text-foreground placeholder:text-foreground/40 focus:outline-none resize-none text-base mb-5"
                rows={1}
                disabled={isGenerating}
                style={{
                  minHeight: "32px",
                  maxHeight: "200px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    200
                  )}px`;
                }}
              />

              {/* Input Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="p-2.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-foreground/50" />
                  </button>
                  <button className="p-2.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5 text-foreground/50" />
                  </button>
                  <button className="p-2.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <LinkIcon className="w-5 h-5 text-foreground/50" />
                  </button>
                  <button className="p-2.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <Mic className="w-5 h-5 text-foreground/50" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isGenerating}
                  className="w-12 h-12 rounded-lg bg-foreground/10 hover:bg-foreground/15 disabled:bg-foreground/5 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground flex items-center justify-center transition-all shrink-0 border border-border/50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
