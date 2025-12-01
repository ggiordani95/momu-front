"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { fileService } from "@/lib/services/fileService";
import type { CreateFileDto } from "@/lib/types";

interface AIAssistantProps {
  workspaceId: string;
  onClose: () => void;
  onFilesCreated?: () => void;
}

export function AIAssistant({
  workspaceId,
  onClose,
  onFilesCreated,
}: AIAssistantProps) {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addOptimisticFile, syncFiles } = useWorkspaceStore();

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

      console.log(`✅ [AI] Generated ${data.files.length} file(s)`);

      // Create files in the backend
      // We need to create files in order, handling parent-child relationships
      const createdFiles: CreateFileDto[] = [];
      const idMap = new Map<string, string>(); // Maps temp IDs to real IDs

      // Extract temp IDs from files (stored in __tempId field by backend)
      const filesWithTempIds = data.files.map((file: any) => {
        const tempId = file.__tempId || `temp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        return { file, tempId };
      });

      // Helper function to create a file and update idMap
      const createFileWithMapping = async (
        fileData: CreateFileDto,
        tempId: string
      ) => {
        // Replace parent_id if it's a temp ID
        if (fileData.parent_id && idMap.has(fileData.parent_id)) {
          fileData.parent_id = idMap.get(fileData.parent_id)!;
        }

        // Remove __tempId from fileData before sending
        const { __tempId, ...cleanFileData } = fileData as any;

        // Create file in backend
        const createdFile = await fileService.create(workspaceId, cleanFileData);
        idMap.set(tempId, createdFile.id);
        createdFiles.push(createdFile);
        console.log(
          `✅ [AI] Created file: ${createdFile.id} - ${createdFile.title}`
        );
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
        } catch (fileError) {
          console.error(`❌ [AI] Error creating file:`, fileError);
          // Continue with other files even if one fails
        }
      }

      // Sync files to update store with real IDs
      await syncFiles();

      // Clear topic and close
      setTopic("");
      onFilesCreated?.();
      onClose();
    } catch (err) {
      console.error("❌ [AI] Error:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao gerar conteúdo"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--sidebar-bg)] rounded-lg p-6 w-full max-w-md border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Assistente de IA</h2>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-foreground/70 mb-4">
          Descreva um tópico e a IA criará uma estrutura organizada de pastas e
          arquivos sobre ele.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium mb-2 text-foreground/80"
            >
              Tópico
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Aprendizado de Machine Learning, História do Brasil, Receitas de Culinária..."
              className="w-full px-3 py-2 bg-background border border-[var(--border-color)] rounded-md text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              rows={4}
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Estrutura
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 border border-[var(--border-color)] rounded-md text-foreground/70 hover:text-foreground hover:bg-hover/50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-foreground/50 text-center">
            Dica: Pressione Ctrl+Enter para gerar rapidamente
          </p>
        </div>
      </div>
    </div>
  );
}

