import type { HierarchicalFile } from "@/lib/types";

interface ApplyOptimisticUpdateParams {
  files: HierarchicalFile[];
  filesContext: {
    items: HierarchicalFile[];
    setFiles: (files: HierarchicalFile[]) => void;
  } | null;
  currentFileId: string | null;
  reorderedFiles: HierarchicalFile[];
}

/**
 * Função utilitária para atualização otimista do estado local
 */
export function applyOptimisticUpdate({
  files,
  filesContext,
  currentFileId,
  reorderedFiles,
}: ApplyOptimisticUpdateParams) {
  if (!filesContext) return;

  // Create a map of original items by ID for preserving full item data
  const originalItemsMap = new Map<string, HierarchicalFile>();
  const buildFilesMap = (filesList: HierarchicalFile[]) => {
    filesList.forEach((file) => {
      originalItemsMap.set(file.id, file);
      if (file.children) {
        buildFilesMap(file.children);
      }
    });
  };
  buildFilesMap(files);

  const updateFilesRecursive = (
    filesList: HierarchicalFile[]
  ): HierarchicalFile[] => {
    // If we're at the root level and currentFolderId is null, update root items
    if (!currentFileId) {
      // Get root items that are NOT being reordered (they have parent_id or are not in reordered list)
      const reorderedFileIds = new Set(reorderedFiles.map((file) => file.id));
      const otherRootItems = filesList.filter(
        (file) => !file.parent_id && !reorderedFileIds.has(file.id)
      );

      // Build updated root items: reordered items first (with full data from original), then others
      const updatedReorderedFiles = reorderedFiles.map((reorderedFile) => {
        const originalFile = originalItemsMap.get(reorderedFile.id);
        if (originalFile) {
          return {
            ...originalFile,
            order_index: reorderedFile.order_index,
          };
        }
        return reorderedFile;
      });

      // Get nested items (with parent_id) and update their children recursively
      const nestedFiles = filesList
        .filter((file) => file.parent_id)
        .map((file) => {
          if (file.children) {
            return {
              ...file,
              children: updateFilesRecursive(file.children),
            };
          }
          return file;
        });

      // Return: reordered root items + other root items + nested items
      return [...updatedReorderedFiles, ...otherRootItems, ...nestedFiles];
    }

    // If we're inside a folder, update that folder's children
    return filesList.map((file) => {
      if (file.id === currentFileId) {
        // Replace children with reordered items (preserving full item data)
        const updatedChildren = reorderedFiles.map((reorderedFile) => {
          const originalChild = originalItemsMap.get(reorderedFile.id);
          if (originalChild) {
            return {
              ...originalChild,
              order_index: reorderedFile.order_index,
            };
          }
          return reorderedFile;
        });

        return {
          ...file,
          children: updatedChildren,
        };
      }
      if (file.children) {
        return { ...file, children: updateFilesRecursive(file.children) };
      }
      return file;
    });
  };

  const updatedFiles = updateFilesRecursive(files);
  filesContext.setFiles(updatedFiles);
}
