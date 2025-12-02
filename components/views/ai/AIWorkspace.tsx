"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
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
  FolderPlus,
  Folder,
  X,
  FileText,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  useAIChats,
  useCreateAIChat,
  useUpdateAIChat,
  useDeleteAIChat,
  useGenerateAI,
} from "@/lib/hooks/querys/useAIChats";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { fileService } from "@/lib/services/fileService";
import type { CreateFileDto, HierarchicalFile } from "@/lib/types";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import {
  AIModelSelector,
  AI_MODELS,
  type AIModelValue,
} from "@/components/AIModelSelector";

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
  const [selectedModel, setSelectedModel] = useState<AIModelValue>(
    AI_MODELS[0].value
  );

  // React Query mutation for AI generation
  const generateAIMutation = useGenerateAI();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedChatForIndex, setSelectedChatForIndex] = useState<
    string | null
  >(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const folderSearchInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { getFilesByWorkspace, syncFiles, currentWorkspace, workspaces } =
    useWorkspaceStore();
  const activeWorkspaceId = currentWorkspace?.id || workspaceId;

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

  const handleIndexChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChatForIndex(chatId);
    setShowFolderModal(true);
  };

  const handleCreateNoteFromChat = async (folderId: string | null) => {
    if (!selectedChatForIndex) return;

    const chat = chats.find((c) => c.id === selectedChatForIndex);
    if (!chat) return;

    setIsIndexing(true);
    try {
      // Format chat messages as markdown
      const chatContent = (chat.messages as unknown[])
        .map((m: unknown) => {
          const msg = m as { role: string; content: string };
          const role = msg.role === "user" ? "**Você:**" : "**IA:**";
          return `${role}\n\n${msg.content}\n\n---\n\n`;
        })
        .join("\n");

      const noteTitle = chat.title || "Chat sem título";
      const noteContent = `# ${noteTitle}\n\n${chatContent}`;

      // Create note file
      const noteData: CreateFileDto = {
        type: "note",
        title: noteTitle,
        content: noteContent,
        parent_id: folderId || undefined,
      };

      const { getNextOrderIndex } = useWorkspaceStore.getState();
      const nextOrderIndex = getNextOrderIndex(activeWorkspaceId, folderId);

      await fileService.create(activeWorkspaceId, {
        ...noteData,
        order_index: nextOrderIndex,
      });

      // Sync files to update the store
      await syncFiles();

      // Close modal and show success
      setShowFolderModal(false);
      setSelectedChatForIndex(null);
      alert("Nota criada com sucesso!");
    } catch (error) {
      console.error("❌ [AI] Error creating note from chat:", error);
      alert("Erro ao criar nota. Tente novamente.");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || generateAIMutation.isPending) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Get userId from localStorage
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("userId") || "user-001"
        : "user-001";

    // Use React Query mutation
    generateAIMutation.mutate(
      {
        topic: userMessage.content,
        workspaceId,
        userId,
        model: selectedModel,
      },
      {
        onSuccess: (data) => {
          if (!data.success) {
            throw new Error(data.message || "No response from AI");
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
        },
        onError: (err) => {
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `❌ Erro ao gerar estrutura: ${
              err instanceof Error ? err.message : "Erro desconhecido"
            }`,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, errorMessage]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateNote = async (folderId: string | null) => {
    if (!selectedText.trim()) return;

    setIsIndexing(true);
    try {
      // Extract title from first line or first 50 chars
      const firstLine = selectedText.split("\n")[0].trim();
      const noteTitle =
        firstLine.length > 0 && firstLine.length <= 100
          ? firstLine.replace(/^#+\s*/, "") // Remove markdown headers
          : selectedText.substring(0, 50).trim() || "Nota da IA";

      const noteContent = selectedText;

      const noteData: CreateFileDto = {
        type: "note",
        title: noteTitle,
        content: noteContent,
        parent_id: folderId || undefined,
      };

      const { getNextOrderIndex } = useWorkspaceStore.getState();
      const nextOrderIndex = getNextOrderIndex(activeWorkspaceId, folderId);

      await fileService.create(activeWorkspaceId, {
        ...noteData,
        order_index: nextOrderIndex,
      });
      await syncFiles();

      setShowNoteModal(false);
      setSelectedText("");
      alert("Nota criada com sucesso!");
    } catch (error) {
      console.error("❌ [AI] Error creating note from selection:", error);
      alert("Erro ao criar nota. Tente novamente.");
    } finally {
      setIsIndexing(false);
    }
  };

  // Build hierarchy and filtered folders with paths
  const workspaceFiles = getFilesByWorkspace(activeWorkspaceId);
  const hierarchicalFiles = useMemo(
    () => buildHierarchy(workspaceFiles as HierarchicalFile[]),
    [workspaceFiles]
  );

  // Helper function to build folder path
  const buildFolderPath = (
    files: HierarchicalFile[],
    targetId: string,
    currentPath: string[] = []
  ): string[] | null => {
    for (const file of files) {
      if (file.id === targetId) {
        return [...currentPath, file.title];
      }
      if (file.children) {
        const found = buildFolderPath(file.children, targetId, [
          ...currentPath,
          file.title,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  const foldersWithPaths = useMemo(() => {
    const folders = workspaceFiles.filter(
      (file) => file.type === "folder" && file.active !== false
    );

    return folders
      .map((folder) => {
        const path = buildFolderPath(hierarchicalFiles, folder.id);
        return {
          ...folder,
          path: path || [folder.title],
        };
      })
      .filter((folder) => {
        if (!folderSearchQuery) return true;
        const query = folderSearchQuery.toLowerCase();
        const titleMatch = folder.title.toLowerCase().includes(query);
        const pathMatch = folder.path.some((p) =>
          p.toLowerCase().includes(query)
        );
        return titleMatch || pathMatch;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceFiles, hierarchicalFiles, folderSearchQuery]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (showNoteModal) {
      setTimeout(() => folderSearchInputRef.current?.focus(), 100);
    } else {
      setFolderSearchQuery("");
    }
  }, [showNoteModal]);

  return (
    <div className="h-full flex bg-background">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className="w-64 border-r border-border bg-background flex flex-col"
      >
        {/* Workspace Selector */}
        <div className="p-3 border-b border-border">
          <WorkspaceSelector
            currentWorkspaceId={workspaceId}
            currentView="ai"
          />
        </div>

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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleIndexChat(chat.id, e)}
                          className="p-1.5  rounded transition-colors"
                          title="Indexar como nota"
                        >
                          <FolderPlus className="w-4 h-4 text-foreground/40" />
                        </button>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="p-1.5 hover:bg-foreground/10 rounded transition-colors"
                          title="Deletar chat"
                        >
                          <Trash2 className="w-4 h-4 text-foreground/40" />
                        </button>
                      </div>
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
            <AIModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={generateAIMutation.isPending}
              compact={true}
            />
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
              <div className="text-center max-w-2xl space-y-4">
                <div className="font-medium text-foreground/40 text-xl mb-6">
                  Comece uma nova conversa
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-8 space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 group ${
                    message.role === "user"
                      ? "justify-end items-start"
                      : "justify-start items-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex flex-col items-center">
                      <Airplay className="w-5 h-5 text-foreground/50" />
                      <div className="p-2 mt-4 flex flex-col items-center border-l border-border/30 bg-accent rounded-lg transition-colors pt-3 pb-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedText(message.content);
                            setShowNoteModal(true);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1 flex items-center gap-2 rounded-md transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Criar nota com este conteúdo"
                        >
                          <FileText className="w-5 h-5 text-black mb-0.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex-1 max-w-[75%] relative ${
                      message.role === "user" ? "order-first" : ""
                    }`}
                  >
                    <div
                      className={`relative ${
                        message.role === "user"
                          ? "text-foreground"
                          : "bg-foreground/5 text-foreground border border-border/50 rounded-lg"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="text-base leading-relaxed text-end whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <div className="flex items-start">
                          {/* Conteúdo principal */}
                          <div className="flex-1 p-5">
                            <div
                              className="selectable-content"
                              style={{
                                userSelect: "text",
                                WebkitUserSelect: "text",
                                MozUserSelect: "text",
                                msUserSelect: "text",
                              }}
                            >
                              <MarkdownRenderer
                                content={message.content}
                                className="text-base leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
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
              {generateAIMutation.isPending && (
                <div className="flex gap-4 justify-start items-start">
                  <Airplay className="w-5 h-5 text-foreground/50" />
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
                disabled={generateAIMutation.isPending}
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
                  <button className="p-2.5  rounded-lg transition-colors">
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
                  disabled={!input.trim() || generateAIMutation.isPending}
                  className="w-12 h-12 rounded-lg bg-foreground/10  disabled:bg-foreground/5 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground flex items-center justify-center transition-all shrink-0 border border-border/50"
                >
                  {generateAIMutation.isPending ? (
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

      {/* Create Note Button (floating when text is selected) */}

      {/* Note Creation Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
          {/* Backdrop with blur - Glass effect */}
          <div
            className="fixed inset-0 transition-opacity duration-500"
            onClick={() => {
              setShowNoteModal(false);
              setSelectedText("");
            }}
            style={{
              backgroundColor:
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "rgba(0, 0, 0, 0.2)"
                  : "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(1px) saturate(120%)",
              WebkitBackdropFilter: "blur(1px) saturate(120%)",
            }}
          />
          {/* Modal Container - Glass effect Style */}
          <div
            className="w-full max-w-[700px] relative z-10 animate-in fade-in zoom-in-95 duration-200"
            style={{
              animation: "spotlight-in 0.1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              className="rounded-3xl overflow-hidden shadow-2xl border"
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "rgba(0, 0, 0, 0.92)"
                    : "rgba(255, 255, 255, 0.772)",
                backdropFilter: "blur(80px) saturate(180%)",
                WebkitBackdropFilter: "blur(80px) saturate(180%)",
                border:
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "1px solid rgba(255, 255, 255, 0.15)"
                    : "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow:
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "0 20px 60px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(255, 255, 255, 0.05)"
                    : "0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.3)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-8 py-6 border-b"
                style={{
                  borderColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.023)"
                      : "rgba(255, 255, 255, 0.12)",
                  backgroundColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                }}
              >
                <h2
                  className="text-2xl font-semibold"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.9)"
                        : "rgba(0, 0, 0, 0.9)",
                  }}
                >
                  Criar Nota
                </h2>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedText("");
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(0, 0, 0, 0.5)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div
                className="px-6 py-5"
                style={{
                  backgroundColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                }}
              >
                <p
                  className="text-base mb-3"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(0, 0, 0, 0.7)",
                  }}
                >
                  Workspace:{" "}
                  <strong>
                    {workspaces.find((w) => w.id === activeWorkspaceId)?.title}
                  </strong>
                </p>

                <p
                  className="text-base mb-4"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  Selecione a pasta onde deseja salvar a nota. Deixe vazio para
                  salvar na raiz.
                </p>

                {/* Search Bar */}
                <div
                  className="mb-4 flex items-center px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.05)",
                    borderColor:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Search
                    size={18}
                    style={{
                      color:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.5)"
                          : "rgba(0, 0, 0, 0.5)",
                      marginRight: "12px",
                    }}
                  />
                  <input
                    ref={folderSearchInputRef}
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    placeholder="Buscar pasta..."
                    className="flex-1 bg-transparent border-none outline-none text-base"
                    style={{
                      color:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(0, 0, 0, 0.9)",
                      caretColor: "#007AFF",
                    }}
                  />
                  {folderSearchQuery && (
                    <button
                      onClick={() => setFolderSearchQuery("")}
                      className="ml-2 p-1 rounded transition-colors"
                      style={{
                        color:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div
                  className="space-y-3 max-h-96 overflow-y-auto mb-6"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.2) transparent"
                        : "rgba(0, 0, 0, 0.2) transparent",
                  }}
                >
                  {!folderSearchQuery && (
                    <button
                      onClick={() => handleCreateNote(null)}
                      disabled={isIndexing}
                      className="w-full flex flex-row items-center text-left px-6 py-4 rounded-xl transition-all duration-150 disabled:opacity-50"
                      style={{
                        backgroundColor:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.05)",
                        color:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.9)"
                            : "rgba(0, 0, 0, 0.9)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isIndexing) {
                          e.currentTarget.style.backgroundColor =
                            typeof window !== "undefined" &&
                            window.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? "rgba(255, 255, 255, 0.1)"
                              : "rgba(0, 0, 0, 0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      <Folder
                        size={20}
                        className="inline mr-3"
                        style={{ color: "#3b82f6" }}
                      />
                      <div className="flex flex-col">
                        <span className="text-base font-medium">
                          {workspaces.find((w) => w.id === activeWorkspaceId)
                            ?.title || "Workspace"}
                        </span>
                      </div>
                    </button>
                  )}
                  {foldersWithPaths.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleCreateNote(folder.id)}
                      disabled={isIndexing}
                      className="w-full flex flex-row items-center text-left px-6 py-4 rounded-xl transition-all duration-150 disabled:opacity-50"
                      style={{
                        backgroundColor:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.05)",
                        color:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.9)"
                            : "rgba(0, 0, 0, 0.9)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isIndexing) {
                          e.currentTarget.style.backgroundColor =
                            typeof window !== "undefined" &&
                            window.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? "rgba(255, 255, 255, 0.1)"
                              : "rgba(0, 0, 0, 0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      <Folder
                        size={20}
                        className="inline mr-3 align-top"
                        style={{ color: "#3b82f6", marginTop: "2px" }}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-base font-medium">
                          {folder.title}
                        </span>
                        <span
                          className="text-sm mt-1 truncate font-semibold"
                          style={{
                            color:
                              typeof window !== "undefined" &&
                              window.matchMedia("(prefers-color-scheme: dark)")
                                .matches
                                ? "rgba(255, 255, 255, 0.5)"
                                : "rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          {(() => {
                            const workspaceName =
                              workspaces.find((w) => w.id === activeWorkspaceId)
                                ?.title || "Workspace";
                            return `${workspaceName} / ${folder.path.join(
                              " / "
                            )}`;
                          })()}
                        </span>
                      </div>
                    </button>
                  ))}
                  {folderSearchQuery && foldersWithPaths.length === 0 && (
                    <div
                      className="py-8 text-center"
                      style={{
                        color:
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      Nenhuma pasta encontrada
                    </div>
                  )}
                </div>

                {isIndexing && (
                  <div
                    className="flex items-center justify-center gap-2 text-sm"
                    style={{
                      color:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.6)"
                          : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando nota...
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx global>{`
            @keyframes spotlight-in {
              from {
                opacity: 0;
                transform: scale(0.96) translateY(-10px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
        </div>
      )}

      {/* Folder Selection Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
          {/* Backdrop with blur - Glass effect */}
          <div
            className="fixed inset-0 transition-opacity duration-500"
            onClick={() => {
              setShowFolderModal(false);
              setSelectedChatForIndex(null);
            }}
            style={{
              backgroundColor:
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "rgba(0, 0, 0, 0.2)"
                  : "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(1px) saturate(120%)",
              WebkitBackdropFilter: "blur(1px) saturate(120%)",
            }}
          />

          {/* Modal Container - Glass effect Style */}
          <div
            className="w-full max-w-[500px] relative z-10 animate-in fade-in zoom-in-95 duration-200"
            style={{
              animation: "spotlight-in 0.1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              className="rounded-3xl overflow-hidden shadow-2xl border"
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "rgba(0, 0, 0, 0.775)"
                    : "rgba(255, 255, 255, 0.6)",
                boxShadow:
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(255, 255, 255, 0.05)"
                    : "0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.3)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 border-b"
                style={{
                  borderColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.3)",
                  backgroundColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.742)"
                        : "rgba(0, 0, 0, 0.622)",
                  }}
                >
                  Escolher Pasta
                </h2>
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setSelectedChatForIndex(null);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(0, 0, 0, 0.5)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div
                className="px-6 py-5"
                style={{
                  backgroundColor:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                }}
              >
                <p
                  className="text-sm mb-4"
                  style={{
                    color:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  Selecione a pasta onde deseja salvar a nota do chat. Deixe
                  vazio para salvar na raiz.
                </p>

                <div
                  className="space-y-2 max-h-64 overflow-y-auto mb-4"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor:
                      typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "rgba(255, 255, 255, 0.2) transparent"
                        : "rgba(0, 0, 0, 0.2) transparent",
                  }}
                >
                  <button
                    onClick={() => handleCreateNoteFromChat(null)}
                    disabled={isIndexing}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all duration-150 disabled:opacity-50"
                    style={{
                      backgroundColor:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.05)",
                      color:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(0, 0, 0, 0.9)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isIndexing) {
                        e.currentTarget.style.backgroundColor =
                          typeof window !== "undefined" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.05)";
                    }}
                  >
                    <Folder
                      size={18}
                      className="inline mr-2"
                      style={{ color: "#3b82f6" }}
                    />
                    Raiz (sem pasta)
                  </button>
                  {getFilesByWorkspace(workspaceId)
                    .filter(
                      (file) => file.type === "folder" && file.active !== false
                    )
                    .map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleCreateNoteFromChat(folder.id)}
                        disabled={isIndexing}
                        className="w-full flex flex-row text-left px-4 py-3 rounded-xl transition-all duration-150 disabled:opacity-50"
                        style={{
                          backgroundColor:
                            typeof window !== "undefined" &&
                            window.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.05)",
                          color:
                            typeof window !== "undefined" &&
                            window.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? "rgba(255, 255, 255, 0.9)"
                              : "rgba(0, 0, 0, 0.9)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isIndexing) {
                            e.currentTarget.style.backgroundColor =
                              typeof window !== "undefined" &&
                              window.matchMedia("(prefers-color-scheme: dark)")
                                .matches
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            typeof window !== "undefined" &&
                            window.matchMedia("(prefers-color-scheme: dark)")
                              .matches
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.05)";
                        }}
                      >
                        <Folder
                          size={18}
                          className="inline mr-2"
                          style={{ color: "#3b82f6" }}
                        />
                        <span className="text-base font-medium">
                          {folder.title}
                        </span>
                      </button>
                    ))}
                </div>

                {isIndexing && (
                  <div
                    className="flex items-center justify-center gap-2 text-sm"
                    style={{
                      color:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches
                          ? "rgba(255, 255, 255, 0.6)"
                          : "rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando nota...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
