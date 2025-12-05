"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  Loader2,
  X,
  ArrowUp,
  Image as ImageIcon,
} from "lucide-react";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { fileService } from "@/modules/files";
import type { CreateFileDto } from "@/lib/types";
import {
  AI_MODELS,
  type AIModelValue,
} from "@/modules/ai/components/AIModelSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AIAssistantProps {
  workspaceId: string;
  onClose: () => void;
  onFilesCreated?: () => void;
}

const PROMPTS = [
  {
    icon: Sparkles,
    text: "Criar estrutura de aprendizado",
    prompt:
      "Crie uma estrutura organizada de pastas e arquivos sobre [tópico], incluindo módulos, notas e vídeos para facilitar o aprendizado.",
  },
  {
    icon: Sparkles,
    text: "Gerar conteúdo educacional",
    prompt:
      "Gere conteúdo educacional completo sobre [tópico] com organização hierárquica, incluindo conceitos básicos, exemplos práticos e recursos visuais.",
  },
  {
    icon: Sparkles,
    text: "Organizar material de estudo",
    prompt:
      "Organize o material de estudo sobre [tópico] em uma estrutura clara e progressiva, do básico ao avançado, com pastas para cada módulo.",
  },
];

export function AIAssistant({
  workspaceId,
  onClose,
  onFilesCreated,
}: AIAssistantProps) {
  const [topic, setTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState<AIModelValue>(
    AI_MODELS[0].value
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addOptimisticFile, syncWorkspaces } = useWorkspaceStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Por favor, digite um tópico");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get userId from store or localStorage
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
          topic: topic.trim(),
          workspaceId,
          userId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate content");
      }

      const data = await response.json();

      if (!data.success || !data.files || data.files.length === 0) {
        throw new Error("No files were generated");
      }

      // Create files in the backend
      // We need to create files in order, handling parent-child relationships
      const createdFiles: CreateFileDto[] = [];
      const idMap = new Map<string, string>(); // Maps temp IDs to real IDs

      // Extract temp IDs from files (stored em __tempId pelo backend ou gerados aqui)
      const filesWithTempIds = data.files.map(
        (file: CreateFileDto & { __tempId?: string }) => {
          const tempId =
            file.__tempId ||
            `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return { file, tempId };
        }
      );

      // Helper function to create a file and update idMap
      const createFileWithMapping = async (
        fileData: CreateFileDto,
        tempId: string
      ) => {
        // Replace parent_id if it's a temp ID
        if (fileData.parent_id && idMap.has(fileData.parent_id)) {
          fileData.parent_id = idMap.get(fileData.parent_id)!;
        }

        // Remove __tempId from fileData antes de enviar
        const { __tempId, ...cleanFileData } = fileData as CreateFileDto & {
          __tempId?: string;
        };

        const { getNextOrderIndex } = useWorkspaceStore.getState();
        const parentId = cleanFileData.parent_id || null;
        const nextOrderIndex = getNextOrderIndex(workspaceId, parentId);

        // Create file in backend with calculated order_index
        const createdFile = await fileService.create(workspaceId, {
          ...cleanFileData,
          order_index: nextOrderIndex,
        });
        idMap.set(tempId, createdFile.id);
        createdFiles.push(createdFile as CreateFileDto);
        return createdFile;
      };

      // Create files sequentially to handle parent-child relationships
      // Files are already ordered by the backend (parents before children)
      for (const { file: fileData, tempId } of filesWithTempIds) {
        try {
          // Add optimistic file to store (with temp ID)
          addOptimisticFile({
            ...fileData,
            id: tempId,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Create file in backend
          await createFileWithMapping(fileData, tempId);
        } catch (_fileError) {
          // Continue with other files even if one fails
        }
      }

      // Sync files to update store with real IDs
      await syncWorkspaces();

      // Clear topic and close
      setTopic("");
      onFilesCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar conteúdo");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (inputRef.current) {
      const promptText = prompt.replace("[tópico]", topic || "[seu tópico]");
      inputRef.current.value = promptText;
      setTopic(promptText);
      inputRef.current.focus();
    }
  };

  const handleModelChange = (value: string) => {
    const model = AI_MODELS.find((m) => m.value === value);
    if (model) {
      setSelectedModel(model.value);
    }
  };

  const getModelName = () => {
    return AI_MODELS.find((m) => m.value === selectedModel)?.name || "GPT-4";
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover rounded-lg p-6 w-full max-w-2xl border border-border shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-popover-foreground">
              Assistente de IA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Descreva um tópico e a IA criará uma estrutura organizada de pastas e
          arquivos sobre ele.
        </p>

        <div className="flex flex-col gap-4">
          {/* Input Box - estilo ai-02 */}
          <div className="flex min-h-[120px] flex-col rounded-2xl cursor-text bg-card border border-border shadow-lg">
            <div className="flex-1 relative overflow-y-auto max-h-[258px]">
              <Textarea
                ref={inputRef}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Aprendizado de Machine Learning, História do Brasil, Receitas de Culinária..."
                className="w-full border-0 p-3 transition-[padding] duration-200 ease-in-out min-h-[48.4px] outline-none text-[16px] text-foreground resize-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent whitespace-pre-wrap wrap-break-word"
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>

            <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1 border-t border-border/50">
              <div className="flex aspect-1 items-center gap-1 rounded-full bg-muted p-1.5 text-xs">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="relative flex items-center">
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-fit border-none bg-transparent p-0 text-sm text-muted-foreground hover:text-foreground focus:ring-0 shadow-none">
                    <SelectValue>
                      <span>{getModelName()}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span>{model.name}</span>
                          {model.description && (
                            <span className="text-muted-foreground text-xs">
                              {model.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground transition-all duration-100"
                  title="Anexar imagens"
                  disabled={isGenerating}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-full transition-all duration-100 cursor-pointer",
                    topic && !isGenerating
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-muted"
                  )}
                  disabled={!topic.trim() || isGenerating}
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-primary-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Prompt Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {PROMPTS.map((button) => {
              const IconComponent = button.icon;
              return (
                <Button
                  key={button.text}
                  variant="ghost"
                  className="group flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-foreground transition-all duration-200 hover:bg-muted/30 h-auto bg-transparent"
                  onClick={() => handlePromptClick(button.prompt)}
                  disabled={isGenerating}
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span>{button.text}</span>
                </Button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Dica: Pressione Ctrl+Enter para gerar rapidamente
          </p>
        </div>
      </div>
    </div>
  );
}
