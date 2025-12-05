"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Search,
  Settings,
  Trash2,
  Sparkles,
  User,
  LogOut,
  FolderTree,
  Copy,
} from "lucide-react";
import { FolderIcon, NoteIcon, VideoIcon } from "@/components/Icons";
import { HierarchicalFile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { buildHierarchy } from "@/modules/files";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandState } from "cmdk";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchFile extends HierarchicalFile {
  workspaceName?: string;
  workspaceId?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

// Component to access search value from Command
function CommandSearchResults({ onClose }: { onClose: () => void }) {
  const search = useCommandState((state) => state.search);
  const router = useRouter();
  const { files: allFilesFromStore, getWorkspaceById } = useWorkspaceStore();

  // Get files from all workspaces
  const activeFiles = useMemo(() => {
    const filtered = allFilesFromStore.filter((file) => {
      const isTemporary = file.id.startsWith("temp-");
      const isActive = file.active !== false;
      const hasWorkspace = !!file.workspace_id;
      const hasValidTimestamp = !!file.created_at;
      const shouldInclude =
        !isTemporary && isActive && hasWorkspace && hasValidTimestamp;
      return shouldInclude;
    });
    return filtered;
  }, [allFilesFromStore]);

  const files = useMemo(() => {
    try {
      return buildHierarchy(activeFiles as HierarchicalFile[]);
    } catch (error) {
      console.error("[GlobalSearch] Error building hierarchy:", error);
      return [];
    }
  }, [activeFiles]);

  const filterFiles = (search: string): SearchFile[] => {
    if (!search) return [];

    const filtered = activeFiles
      .filter((file) => {
        const matches =
          file.title.toLowerCase().includes(search.toLowerCase()) &&
          !file.id.startsWith("temp-") &&
          file.active !== false &&
          !!file.workspace_id;
        return matches;
      })
      .slice(0, 10)
      .map((file) => {
        const workspace = getWorkspaceById(file.workspace_id || "");
        return {
          ...file,
          workspaceName: workspace?.title || "Unknown",
          workspaceId: file.workspace_id,
        } as SearchFile;
      });

    return filtered;
  };

  const buildPath = (
    files: HierarchicalFile[],
    targetId: string,
    currentPath: string[] = []
  ): string[] | null => {
    for (const file of files) {
      if (file.id === targetId) {
        return [...currentPath, file.id];
      }
      if (file.children) {
        const found = buildPath(file.children, targetId, [
          ...currentPath,
          file.id,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSelect = (file: SearchFile) => {
    if (file.workspaceId) {
      const { setCurrentWorkspace, workspaces } = useWorkspaceStore.getState();
      const workspace = workspaces.find((w) => w.id === file.workspaceId);
      if (workspace) {
        setCurrentWorkspace({
          id: workspace.id,
          title: workspace.title,
        });
      }
    }

    const path = buildPath(files, file.id);
    if (path) {
      router.push(`/explorer/${path.join("/")}`);
    } else {
      router.push(`/explorer/${file.id}`);
    }
    onClose();
  };

  const filteredFiles = filterFiles(search);

  if (!search) return null;

  return (
    <>
      {filteredFiles.map((file) => (
        <CommandItem
          key={file.id}
          value={`${file.title} ${file.workspaceName || ""}`}
          onSelect={() => handleSelect(file)}
          className="mx-2 rounded-lg py-2.5"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 flex items-center justify-center w-10 h-10">
              {file.type === "folder" ? (
                <FolderIcon size={20} />
              ) : file.type === "video" ? (
                <VideoIcon size={20} />
              ) : (
                <NoteIcon size={20} />
              )}
            </div>

            <div className="flex-1 overflow-hidden min-w-0">
              <div className="text-sm font-medium truncate mb-0.5">
                {file.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {file.type === "folder"
                    ? "Pasta"
                    : file.type === "video"
                    ? "Vídeo"
                    : file.type === "note"
                    ? "Nota"
                    : "Arquivo"}
                </span>
                {file.workspaceName && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate">{file.workspaceName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CommandItem>
      ))}
    </>
  );
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const { setCurrentView, currentWorkspace } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState("");

  // Detect OS for keyboard shortcuts
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const platform = navigator.platform.toLowerCase();
      const userAgent = navigator.userAgent.toLowerCase();
      const isMacOS =
        platform.includes("mac") ||
        platform.includes("iphone") ||
        platform.includes("ipad") ||
        userAgent.includes("mac os x");
      setTimeout(() => {
        setIsMac(isMacOS);
      }, 0);
    }
  }, []);

  const handleNavigateToView = (
    view: "explorer" | "settings" | "trash" | "ai"
  ) => {
    setCurrentView(view);
    if (currentWorkspace?.id) {
      router.push(`/explorer/${currentWorkspace.id}`);
    }
    onClose();
  };

  const handleCreateFile = (type: "note" | "folder" | "video") => {
    // TODO: Implementar criação de arquivo
    console.log("Criar arquivo:", type);
    onClose();
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>Menu de Comandos</DialogTitle>
        <DialogDescription>
          Use o menu de comandos para navegar e executar ações.
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        className="gap-0 overflow-hidden rounded-xl border-border/50 p-0 shadow-lg sm:max-w-lg"
        showCloseButton={false}
      >
        <Command
          shouldFilter={false}
          className="flex h-full w-full flex-col overflow-hidden bg-popover **:data-[slot=command-input-wrapper]:h-auto **:data-[slot=command-input-wrapper]:grow **:data-[slot=command-input-wrapper]:border-0 **:data-[slot=command-input-wrapper]:px-0"
        >
          <div className="flex h-12 items-center gap-2 border-b border-border/50 px-4">
            <CommandInput
              className="h-10 text-[15px]"
              onValueChange={setInputValue}
              placeholder="O que você precisa?"
              value={inputValue}
            />
            <button
              className="flex shrink-0 items-center"
              onClick={onClose}
              type="button"
            >
              <Kbd>Esc</Kbd>
            </button>
          </div>

          <CommandList className="max-h-[500px] py-2">
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            {/* Files Search Group */}
            <CommandGroup heading="Arquivos">
              <CommandSearchResults onClose={onClose} />
            </CommandGroup>

            {/* Navigation Group */}
            <CommandGroup heading="Navegação">
              <CommandItem
                className="mx-2 rounded-lg py-2.5"
                onSelect={() => handleNavigateToView("explorer")}
              >
                <FolderTree size={18} aria-hidden />
                Ir para Explorer
                <KbdGroup className="ml-auto">
                  <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd>E</Kbd>
                </KbdGroup>
              </CommandItem>
              <CommandItem
                className="mx-2 rounded-lg py-2.5"
                onSelect={() => handleNavigateToView("trash")}
              >
                <Trash2 size={18} aria-hidden />
                Ir para Lixeira
              </CommandItem>
              <CommandItem
                className="mx-2 rounded-lg py-2.5"
                onSelect={() => handleNavigateToView("settings")}
              >
                <Settings size={18} aria-hidden />
                Ir para Configurações
                <KbdGroup className="ml-auto">
                  <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd>,</Kbd>
                </KbdGroup>
              </CommandItem>
              <CommandItem
                className="mx-2 rounded-lg py-2.5"
                onSelect={() => handleNavigateToView("ai")}
              >
                <Sparkles size={18} aria-hidden />
                Ir para IA
              </CommandItem>
            </CommandGroup>

            {/* Create Files Group */}
            {!inputValue && (
              <CommandGroup heading="Criar">
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => handleCreateFile("note")}
                >
                  <NoteIcon size={18} />
                  Criar Nota
                  <KbdGroup className="ml-auto">
                    <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                    <Kbd>N</Kbd>
                  </KbdGroup>
                </CommandItem>
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => handleCreateFile("folder")}
                >
                  <FolderIcon size={18} />
                  Criar Pasta
                </CommandItem>
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => handleCreateFile("video")}
                >
                  <VideoIcon size={18} />
                  Criar Vídeo
                </CommandItem>
              </CommandGroup>
            )}

            {/* Quick Actions Group */}
            {!inputValue && (
              <CommandGroup heading="Ações Rápidas">
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => {
                    // TODO: Implementar cópia de URL
                    navigator.clipboard.writeText(window.location.href);
                    onClose();
                  }}
                >
                  <Copy size={18} aria-hidden />
                  Copiar URL Atual
                  <KbdGroup className="ml-auto">
                    <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                    <Kbd>⇧</Kbd>
                    <Kbd>C</Kbd>
                  </KbdGroup>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Account Group */}
            {!inputValue && (
              <CommandGroup heading="Conta">
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => {
                    // TODO: Implementar troca de workspace
                    onClose();
                  }}
                >
                  <User size={18} aria-hidden />
                  Trocar Workspace...
                </CommandItem>
                <CommandItem
                  className="mx-2 rounded-lg py-2.5"
                  onSelect={() => {
                    // TODO: Implementar logout
                    onClose();
                  }}
                >
                  <LogOut size={18} aria-hidden />
                  Sair
                  <KbdGroup className="ml-auto">
                    <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                    <Kbd>Q</Kbd>
                  </KbdGroup>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Floating search button component
export function FloatingSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 bg-background/80 border border-border right-6 z-99999 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-accent"
      style={{
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
      }}
      title="Buscar arquivos e pastas (Ctrl+/)"
    >
      <Search size={20} className="text-muted-foreground" />
    </button>
  );
}
