"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TextBlock from "./TextBlock";
import { Plus } from "lucide-react";

interface Block {
  id: string;
  content: string;
  type: "text";
}

interface BlockEditorProps {
  content: string; // JSON string of blocks array
  onSave: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Parse content from JSON or HTML (backward compatibility)
function parseContent(content: string): Block[] {
  if (!content || !content.trim()) {
    return [{ id: `block-${Date.now()}`, content: "", type: "text" }];
  }

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((block) => ({
        id: block.id || `block-${Date.now()}-${Math.random()}`,
        content: block.content || "",
        type: block.type || "text",
      }));
    }
  } catch {
    // Not JSON, treat as HTML (backward compatibility)
    // Convert HTML to a single block
    return [{ id: `block-${Date.now()}`, content: content, type: "text" }];
  }

  return [{ id: `block-${Date.now()}`, content: "", type: "text" }];
}

// Serialize blocks to JSON
function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

export default function BlockEditor({
  content,
  onSave,
  placeholder = "Digite '/' para comandos ou comece a escrever...",
  autoFocus = false,
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(content));
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const lastSavedContentRef = useRef(content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update blocks when content prop changes (from external updates)
  useEffect(() => {
    if (content !== lastSavedContentRef.current) {
      const parsed = parseContent(content);
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setBlocks(parsed);
        lastSavedContentRef.current = content;
      }, 0);
    }
  }, [content]);

  // Save blocks to parent
  const saveBlocks = useCallback(
    (blocksToSave: Block[]) => {
      const serialized = serializeBlocks(blocksToSave);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (serialized !== lastSavedContentRef.current) {
          lastSavedContentRef.current = serialized;
          onSave(serialized);
        }
      }, 300);
    },
    [onSave]
  );

  // Update a specific block
  const handleBlockUpdate = useCallback(
    (blockId: string, newContent: string) => {
      setBlocks((prev) => {
        const updated = prev.map((block) =>
          block.id === blockId ? { ...block, content: newContent } : block
        );
        saveBlocks(updated);
        return updated;
      });
    },
    [saveBlocks]
  );

  // Add a new block after a specific block
  const handleAddBlock = useCallback(
    (afterBlockId: string) => {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === afterBlockId);
        const newBlock: Block = {
          id: `block-${Date.now()}-${Math.random()}`,
          content: "",
          type: "text",
        };

        const updated = [
          ...prev.slice(0, index + 1),
          newBlock,
          ...prev.slice(index + 1),
        ];

        saveBlocks(updated);
        setFocusBlockId(newBlock.id);
        return updated;
      });
    },
    [saveBlocks]
  );

  // Delete a block
  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        if (prev.length <= 1) {
          // Don't delete the last block, just clear it
          const updated = prev.map((block) =>
            block.id === blockId ? { ...block, content: "" } : block
          );
          saveBlocks(updated);
          return updated;
        }

        const updated = prev.filter((block) => block.id !== blockId);
        saveBlocks(updated);
        return updated;
      });
    },
    [saveBlocks]
  );

  // Add block at the end
  const handleAddBlockAtEnd = useCallback(() => {
    setBlocks((prev) => {
      const newBlock: Block = {
        id: `block-${Date.now()}-${Math.random()}`,
        content: "",
        type: "text",
      };
      const updated = [...prev, newBlock];
      saveBlocks(updated);
      setFocusBlockId(newBlock.id);
      return updated;
    });
  }, [saveBlocks]);

  // Reset focus block ID after it's been used
  useEffect(() => {
    if (focusBlockId) {
      const timer = setTimeout(() => setFocusBlockId(null), 100);
      return () => clearTimeout(timer);
    }
  }, [focusBlockId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => (
        <TextBlock
          key={block.id}
          id={block.id}
          content={block.content}
          onUpdate={handleBlockUpdate}
          onAddBlock={handleAddBlock}
          onDelete={handleDeleteBlock}
          placeholder={placeholder}
          autoFocus={autoFocus && (index === 0 || focusBlockId === block.id)}
          isFirst={index === 0}
        />
      ))}

      {/* Add Block Button at the end */}
      <button
        onClick={handleAddBlockAtEnd}
        className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-hover/50 transition-colors opacity-0 group-hover:opacity-100 group"
        style={{ minHeight: "2rem" }}
        title="Adicionar bloco"
      >
        <Plus size={16} className="opacity-50" />
        <span className="text-sm opacity-50">Adicionar bloco</span>
      </button>
    </div>
  );
}
