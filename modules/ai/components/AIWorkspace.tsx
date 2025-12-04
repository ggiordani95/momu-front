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
} from "@/modules/ai";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import type { CreateFileDto, HierarchicalFile } from "@/lib/types";
import { fileService, buildHierarchy } from "@/modules/files";
import {
  AIModelSelector,
  AI_MODELS,
  type AIModelValue,
} from "@/modules/ai/components/AIModelSelector";

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
  const isLoadingChatRef = useRef(false);

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
  // Use a ref to track if we're loading a chat to avoid saving during load
  useEffect(() => {
    // Don't save if we're currently loading a chat
    if (isLoadingChatRef.current) {
      isLoadingChatRef.current = false;
      return;
    }

    if (messages.length > 0) {
      const title =
        messages.find((m) => m.role === "user")?.content.substring(0, 50) ||
        "New Chat";

      if (currentChatId) {
        // Update existing chat with all messages including content
        updateChatMutation.mutate({
          id: currentChatId,
          data: {
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content, // Ensure content is saved
              timestamp: m.timestamp.toISOString(),
              rawResponse: m.rawResponse,
              fullResponse: m.fullResponse,
            })),
          },
        });
      } else {
        // Create new chat with all messages including content
        createChatMutation.mutate(
          {
            userId,
            workspaceId,
            title,
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content, // Ensure content is saved
              timestamp: m.timestamp.toISOString(),
              rawResponse: m.rawResponse,
              fullResponse: m.fullResponse,
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
      // Set flag to prevent saving during load
      isLoadingChatRef.current = true;

      setCurrentChatId(chat.id);

      // Parse and load messages from chat, ensuring content is preserved
      const loadedMessages = (chat.messages as unknown[]).map((m) => {
        const msg = m as Record<string, unknown>;
        return {
          id: (msg.id as string) || `msg-${Date.now()}-${msg.role}`,
          role: (msg.role as "user" | "assistant") || "user",
          content: (msg.content as string) || "", // Ensure content is loaded
          timestamp: msg.timestamp
            ? new Date(msg.timestamp as string)
            : new Date(),
          rawResponse: msg.rawResponse as string | undefined,
          fullResponse: msg.fullResponse as Record<string, unknown> | undefined,
        } as Message;
      });

      setMessages(loadedMessages);

      // Scroll to bottom after loading chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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
    console.log("[AIWorkspace] handleCreateNote called", {
      selectedTextLength: selectedText.trim().length,
      folderId,
      activeWorkspaceId,
    });

    if (!selectedText.trim()) {
      console.log("[AIWorkspace] handleCreateNote: selectedText is empty");
      return;
    }

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

      console.log("[AIWorkspace] Creating note file", {
        workspaceId: activeWorkspaceId,
        noteData,
        order_index: nextOrderIndex,
      });

      const createdFile = await fileService.create(activeWorkspaceId, {
        ...noteData,
        order_index: nextOrderIndex,
      });

      console.log("[AIWorkspace] Note created successfully", {
        fileId: createdFile.id,
        title: createdFile.title,
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
    console.log("[AIWorkspace] showNoteModal changed:", showNoteModal);
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
        {/* New Chat Button */}
        <div className="p-2 border-b border-border">
          <button
            onClick={clearHistory}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-lg transition-colors text-sm font-medium"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-sm">New Chat</span>
            <span className="ml-auto text-xs text-foreground/40">⌘ /</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <div className="text-center text-xs text-foreground/40 mt-4">
              No matching rooms
            </div>
          ) : (
            <div className="space-y-0.5">
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
                      className={`group px-3 py-2 rounded-lg hover:bg-foreground/5 cursor-pointer text-sm text-foreground/70 truncate flex items-center justify-between ${
                        currentChatId === chat.id ? "bg-foreground/5" : ""
                      }`}
                    >
                      <span className="truncate flex-1">{chat.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleIndexChat(chat.id, e)}
                          className="p-1 rounded transition-colors"
                          title="Indexar como nota"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-foreground/40" />
                        </button>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="p-1 hover:bg-foreground/10 rounded transition-colors"
                          title="Deletar chat"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-foreground/40" />
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
        <div className="border-b border-border p-2 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 ml-4 text-sm text-foreground/60">
            <button className="text-foreground font-medium">Bate-papo</button>
            <button className="hover:text-foreground transition-colors">
              Como fazer
            </button>
          </div>
          <AIModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={generateAIMutation.isPending}
            compact={true}
          />
        </div>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="text-center max-w-2xl space-y-2">
                <div className="font-medium text-foreground/40 text-lg mb-4">
                  Comece uma nova conversa
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 group ${
                    message.role === "user"
                      ? "justify-end items-start"
                      : "justify-start items-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex flex-col items-center">
                      <Airplay className="w-4 h-4 text-foreground/50" />
                      <div className="p-1.5 mt-2 flex flex-col items-center border-l border-border/30 bg-accent rounded-lg transition-colors pt-2 pb-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("[AIWorkspace] Save button clicked", {
                              messageId: message.id,
                              contentLength: message.content.length,
                              showNoteModal: showNoteModal,
                            });
                            setSelectedText(message.content);
                            setShowNoteModal(true);
                            console.log(
                              "[AIWorkspace] showNoteModal set to true"
                            );
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-0.5 flex items-center gap-1.5 rounded-md transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Criar nota com este conteúdo"
                        >
                          <FileText className="w-4 h-4 text-black" />
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
                        <div className="flex-1 p-3">
                          <div
                            className="selectable-content markdown-user-message"
                            style={{
                              userSelect: "text",
                              WebkitUserSelect: "text",
                              MozUserSelect: "text",
                              msUserSelect: "text",
                            }}
                          >
                            <MarkdownRenderer
                              content={message.content}
                              className="leading-relaxed"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start">
                          {/* Conteúdo principal */}
                          <div className="flex-1 p-3">
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
                                className="leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center shrink-0 border border-border">
                      <span className="text-xs font-medium text-foreground/60">
                        V
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {generateAIMutation.isPending && (
                <div className="flex gap-2 justify-start items-start">
                  <Airplay className="w-4 h-4 text-foreground/50" />
                  <div className="flex-1">
                    <div className="bg-foreground/5 rounded-lg p-3 border border-border/50">
                      <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-4xl mx-auto p-3">
            {/* Main Input Container */}
            <div className="relative bg-foreground/5 border border-border rounded-xl p-3">
              {/* Main Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Comece pedindo sobre algo..."
                className="w-full bg-transparent text-foreground placeholder:text-foreground/40 focus:outline-none resize-none text-sm mb-3"
                rows={1}
                disabled={generateAIMutation.isPending}
                style={{
                  minHeight: "24px",
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
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-foreground/50" />
                  </button>
                  <button className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <Paperclip className="w-4 h-4 text-foreground/50" />
                  </button>
                  <button className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <LinkIcon className="w-4 h-4 text-foreground/50" />
                  </button>
                  <button className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors">
                    <Mic className="w-4 h-4 text-foreground/50" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || generateAIMutation.isPending}
                  className="w-9 h-9 rounded-lg bg-foreground/10  disabled:bg-foreground/5 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground flex items-center justify-center transition-all shrink-0 border border-border/50"
                >
                  {generateAIMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Creation Modal */}
      {showNoteModal && typeof window !== "undefined" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNoteModal(false);
              setSelectedText("");
            }
          }}
          style={{ zIndex: 9999 }}
        >
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Criar nota
              </h2>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setSelectedText("");
                }}
                className="p-1 rounded-lg hover:bg-foreground/10 transition-colors"
              >
                <X className="w-4 h-4 text-foreground/60" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/70 mb-2">
                Escolher pasta (opcional)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <input
                  ref={folderSearchInputRef}
                  type="text"
                  placeholder="Buscar pasta..."
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-foreground/5">
                <button
                  onClick={() => handleCreateNote(null)}
                  disabled={isIndexing}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 transition-colors border-b border-border/50"
                >
                  <Folder className="w-4 h-4 inline mr-2 text-foreground/60" />
                  <span className="text-foreground">Raiz do workspace</span>
                </button>
                {foldersWithPaths.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleCreateNote(folder.id)}
                    disabled={isIndexing}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-b-0"
                  >
                    <Folder className="w-4 h-4 inline mr-2 text-foreground/60" />
                    <span className="text-foreground">
                      {folder.path.join(" / ")}
                    </span>
                  </button>
                ))}
                {foldersWithPaths.length === 0 && (
                  <div className="px-3 py-4 text-sm text-foreground/40 text-center">
                    Nenhuma pasta encontrada
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setSelectedText("");
                }}
                disabled={isIndexing}
                className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCreateNote(null)}
                disabled={isIndexing || !selectedText.trim()}
                className="px-4 py-2 text-sm font-medium bg-foreground/10 hover:bg-foreground/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar na raiz"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Selection Modal for Chat Indexing */}
      {showFolderModal && typeof window !== "undefined" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFolderModal(false);
              setSelectedChatForIndex(null);
            }
          }}
          style={{ zIndex: 9999 }}
        >
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Escolher pasta para nota
              </h2>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setSelectedChatForIndex(null);
                }}
                className="p-1 rounded-lg hover:bg-foreground/10 transition-colors"
              >
                <X className="w-4 h-4 text-foreground/60" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/70 mb-2">
                Escolher pasta (opcional)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Buscar pasta..."
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-foreground/5">
                <button
                  onClick={() => handleCreateNoteFromChat(null)}
                  disabled={isIndexing}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 transition-colors border-b border-border/50"
                >
                  <Folder className="w-4 h-4 inline mr-2 text-foreground/60" />
                  <span className="text-foreground">Raiz do workspace</span>
                </button>
                {foldersWithPaths.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleCreateNoteFromChat(folder.id)}
                    disabled={isIndexing}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/10 transition-colors border-b border-border/50 last:border-b-0"
                  >
                    <Folder className="w-4 h-4 inline mr-2 text-foreground/60" />
                    <span className="text-foreground">
                      {folder.path.join(" / ")}
                    </span>
                  </button>
                ))}
                {foldersWithPaths.length === 0 && (
                  <div className="px-3 py-4 text-sm text-foreground/40 text-center">
                    Nenhuma pasta encontrada
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setSelectedChatForIndex(null);
                }}
                disabled={isIndexing}
                className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCreateNoteFromChat(null)}
                disabled={isIndexing}
                className="px-4 py-2 text-sm font-medium bg-foreground/10 hover:bg-foreground/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar na raiz"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
