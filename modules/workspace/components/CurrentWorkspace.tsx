"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  useWorkspaceFiles,
  useCreateFile,
  useUpdateFile,
  useDeleteFile,
} from "@/modules/files";
import type { HierarchicalFile, CreateFileDto } from "@/lib/types";

import SimpleSidebar from "@/modules/sidebar/components/SimpleSidebar";

import { TrashWorkspace } from "@/modules/trash";
import { SettingsWorkspace } from "@/modules/settings";
import { ExplorerWorkspace } from "@/modules/explorer/components/ExplorerWorkspace";
import NoteWorkspace from "@/modules/note/components/NoteWorkspace";

interface CurrentWorkspaceProps {
  workspaceId: string;
  pathSegments?: string[];
}

export default function CurrentWorkspace({
  workspaceId,
  pathSegments = [],
}: CurrentWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState<
    "explorer" | "settings" | "trash"
  >("explorer");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HierarchicalFile | null>(
    null
  );
  const previousEditorPathRef = useRef<string | null>(null);

  // React Query hooks
  const { data: items = [], isLoading: loading } =
    useWorkspaceFiles(workspaceId);
  const createItemMutation = useCreateFile(workspaceId);
  const updateItemMutation = useUpdateFile(workspaceId);
  const deleteItemMutation = useDeleteFile(workspaceId);

  const pathKey = pathSegments.join("/");

  useEffect(() => {
    if (!items || items.length === 0) {
      return;
    }

    const raf = requestAnimationFrame(() => {
      if (!pathSegments || pathSegments.length === 0) {
        setCurrentFolderId(null);
        setSelectedItem(null);
        return;
      }

      const lastSegment = pathSegments[pathSegments.length - 1];
      const targetItem = findItemById(items, lastSegment);

      if (!targetItem) {
        setCurrentFolderId(lastSegment);
        setSelectedItem(null);
        return;
      }

      if (targetItem.type === "folder") {
        setCurrentFolderId(targetItem.id);
        setSelectedItem((prev: HierarchicalFile | null) =>
          prev?.id === targetItem.id ? prev : null
        );
      } else {
        setSelectedItem(targetItem);
        setCurrentFolderId(targetItem.parent_id || null);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [pathKey, items, pathSegments]);

  const handleFolderClick = (folderId: string) => {
    // Build path to folder (including parent folders)
    const buildPathToFolder = (
      items: HierarchicalFile[],
      targetId: string,
      currentPath: string[] = []
    ): string[] | null => {
      for (const item of items) {
        if (item.id === targetId) {
          return [...currentPath, item.id];
        }
        if (item.children) {
          const found = buildPathToFolder(item.children, targetId, [
            ...currentPath,
            item.id,
          ]);
          if (found) return found;
        }
      }
      return null;
    };

    const pathToFolder = buildPathToFolder(items, folderId);
    if (pathToFolder) {
      const newPath = `/${workspaceId}/${pathToFolder.join("/")}`;
      router.push(newPath);
    } else {
      // Fallback: just use the folder ID
      router.push(`/${workspaceId}/${folderId}`);
    }
    setCurrentFolderId(folderId);
  };

  const getBasePathWithoutEditor = () => {
    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);

    if (selectedItem && segments[segments.length - 1] === selectedItem.id) {
      segments.pop();
    }

    if (segments.length === 0) {
      return "/";
    }

    return `/${segments.join("/")}`;
  };

  const appendSegment = (path: string, segment: string) => {
    const trimmed =
      path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
    if (!trimmed || trimmed === "") {
      return `/${segment}`;
    }
    return `${trimmed}/${segment}`;
  };

  const handleItemClick = (item: HierarchicalFile) => {
    // Handle item click (open page, video, etc.)
    if (item.type === "video" && item.youtube_url) {
      window.open(item.youtube_url, "_blank");
    } else if (item.type === "note") {
      // Open page for editing
      setSelectedItem(item);
      setCurrentFolderId(item.parent_id || null);

      const basePath = getBasePathWithoutEditor();
      previousEditorPathRef.current = basePath;
      const nextPath = appendSegment(basePath, item.id);
      router.push(nextPath);
    }
  };

  const handleCloseEditor = () => {
    setSelectedItem(null);
    const previousPath = previousEditorPathRef.current;
    if (previousPath) {
      router.push(previousPath);
      previousEditorPathRef.current = null;
      return;
    }

    const trimmed =
      pathname !== "/" && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
    const segments = trimmed.split("/").filter(Boolean);
    if (segments.length > 0) {
      segments.pop();
      const fallbackPath = segments.length
        ? `/${segments.join("/")}`
        : `/${workspaceId}`;
      router.push(fallbackPath);
    }
  };

  const handleItemUpdate = async (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    // Send to backend - React Query will invalidate and refetch
    try {
      await updateItemMutation.mutateAsync({
        fileId: id,
        data: { [field]: value },
      });
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleBack = () => {
    // Go up one level in the path
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length > 2) {
      // Remove last folder from path
      pathParts.pop();
      const newPath = `/${pathParts.join("/")}`;
      router.push(newPath);
    } else {
      // Go to workspace root
      router.push(`/${workspaceId}`);
      setCurrentFolderId(null);
    }
  };

  const handleItemDelete = async (id: string) => {
    // Send to backend (soft delete) - React Query will invalidate and refetch
    try {
      await deleteItemMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleAddItem = async (itemData: CreateFileDto) => {
    try {
      // Create item in backend - React Query will invalidate and refetch
      const newItem = await createItemMutation.mutateAsync(itemData);

      if (!newItem || ("error" in newItem && newItem.error)) {
        const errorMessage =
          "error" in newItem ? newItem.error : "Erro desconhecido";
        console.error("❌ Failed to create item:", errorMessage);
        alert(`Erro ao criar item: ${errorMessage}`);
        return;
      }
    } catch (error) {
      console.error("❌ Error adding item:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao criar item: ${errorMessage}`);
    }
  };

  return (
    <HomeContent
      currentView={currentView}
      setCurrentView={setCurrentView}
      currentFolderId={currentFolderId}
      selectedItem={selectedItem}
      handleFolderClick={handleFolderClick}
      handleItemClick={handleItemClick}
      handleCloseEditor={handleCloseEditor}
      handleBack={handleBack}
      handleItemUpdate={handleItemUpdate}
      handleAddItem={handleAddItem}
      handleItemDelete={handleItemDelete}
      items={items}
      workspaceId={workspaceId}
      loading={loading}
    />
  );
}

function HomeContent({
  currentView,
  setCurrentView,
  currentFolderId,
  selectedItem,
  handleFolderClick,
  handleItemClick,
  handleCloseEditor,
  handleBack,
  handleItemUpdate,
  handleAddItem,
  handleItemDelete,
  items,
  workspaceId,
  loading,
}: {
  currentView: "explorer" | "settings" | "trash";
  setCurrentView: (view: "explorer" | "settings" | "trash") => void;
  currentFolderId: string | null;
  selectedItem: HierarchicalFile | null;
  handleFolderClick: (folderId: string) => void;
  handleItemClick: (item: HierarchicalFile) => void;
  handleCloseEditor: () => void;
  handleBack: () => void;
  handleItemUpdate: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  handleAddItem: (item: CreateFileDto) => void;
  handleItemDelete: (id: string) => void;
  items: HierarchicalFile[];
  workspaceId: string;
  loading: boolean;
}) {
  return (
    <div
      className="flex h-screen overflow-hidden relative bg-background"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Glassmorphism background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-background"
        style={{
          backdropFilter: "blur(50px) saturate(180%)",
          WebkitBackdropFilter: "blur(50px) saturate(180%)",
        }}
      />

      {/* Sidebar */}
      <SimpleSidebar
        onNavigate={
          setCurrentView as (
            view:
              | "explorer"
              | "settings"
              | "trash"
              | "social"
              | "planner"
              | "ai"
          ) => void
        }
        currentView={currentView}
        workspaceId={workspaceId}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {currentView === "explorer" ? (
          selectedItem && selectedItem.type === "note" ? (
            <NoteWorkspace
              file={selectedItem}
              onBack={handleCloseEditor}
              onUpdate={handleItemUpdate}
            />
          ) : (
            <ExplorerWorkspace
              files={items}
              currentFolderId={currentFolderId}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              onBack={currentFolderId ? handleBack : undefined}
              onAddItem={handleAddItem}
              onItemUpdate={handleItemUpdate}
              onItemDelete={handleItemDelete}
              loading={loading}
            />
          )
        ) : currentView === "trash" ? (
          <TrashWorkspace
            topicId={workspaceId}
            onRestore={() => {
              // React Query will automatically refetch
            }}
            onPermanentDelete={() => {
              // React Query will automatically refetch
            }}
          />
        ) : (
          <SettingsWorkspace />
        )}
      </main>
    </div>
  );
}

function findItemById(
  items: HierarchicalFile[],
  id: string
): HierarchicalFile | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
