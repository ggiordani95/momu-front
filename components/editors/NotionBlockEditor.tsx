"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link,
  Plus,
} from "lucide-react";

interface Block {
  id: string;
  content: string;
}

interface NotionBlockEditorProps {
  content: string;
  onSave: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Parse content - support both JSON array and HTML
function parseContent(content: string): Block[] {
  if (!content || !content.trim()) {
    return [{ id: generateId(), content: "" }];
  }

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        id: item.id || generateId(),
        content: item.content || "",
      }));
    }
  } catch {
    // Not JSON, treat as HTML
    return [{ id: generateId(), content: content }];
  }

  return [{ id: generateId(), content: "" }];
}

function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

// Extensions for each block editor
const blockExtensions = [
  StarterKit.configure({
    underline: false,
    link: false,
  }),
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  TiptapLink.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "text-blue-600 underline cursor-pointer",
    },
  }),
];

export default function NotionBlockEditor({
  content,
  onSave,
  placeholder = "Comece a escrever...",
  autoFocus = false,
}: NotionBlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(content));
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(content);

  // Sync with external content changes
  useEffect(() => {
    if (content !== lastContentRef.current) {
      const parsed = parseContent(content);
      // Use requestAnimationFrame to avoid cascading renders
      requestAnimationFrame(() => {
        setBlocks(parsed);
        lastContentRef.current = content;
      });
    }
  }, [content]);

  // Save blocks
  const saveBlocks = useCallback(
    (blocksToSave: Block[]) => {
      const serialized = serializeBlocks(blocksToSave);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (serialized !== lastContentRef.current) {
          lastContentRef.current = serialized;
          onSave(serialized);
        }
      }, 300);
    },
    [onSave]
  );

  // Update block content
  const updateBlock = useCallback(
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

  // Add block after
  const addBlockAfter = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === blockId);
        if (index === -1) return prev;

        const newBlock: Block = {
          id: generateId(),
          content: "",
        };

        const updated = [
          ...prev.slice(0, index + 1),
          newBlock,
          ...prev.slice(index + 1),
        ];

        saveBlocks(updated);
        setFocusedBlockId(newBlock.id);
        return updated;
      });
    },
    [saveBlocks]
  );

  // Delete block
  const deleteBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        if (prev.length <= 1) {
          // Keep at least one block
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

  // Add block at end
  const addBlockAtEnd = useCallback(() => {
    setBlocks((prev) => {
      const newBlock: Block = {
        id: generateId(),
        content: "",
      };
      const updated = [...prev, newBlock];
      saveBlocks(updated);
      setFocusedBlockId(newBlock.id);
      return updated;
    });
  }, [saveBlocks]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-0.5">
      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          onUpdate={updateBlock}
          onAddAfter={addBlockAfter}
          onDelete={deleteBlock}
          placeholder={placeholder}
          autoFocus={autoFocus && (index === 0 || focusedBlockId === block.id)}
          isFirst={index === 0}
        />
      ))}
      <button
        onClick={addBlockAtEnd}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hover/30 transition-colors opacity-0 group-hover:opacity-100 text-sm text-foreground/50"
        title="Adicionar bloco"
      >
        <Plus size={14} />
        <span>Adicionar bloco</span>
      </button>
    </div>
  );
}

// Individual block component
function BlockItem({
  block,
  onUpdate,
  onAddAfter,
  onDelete,
  placeholder,
  autoFocus,
  isFirst,
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  autoFocus: boolean;
  isFirst: boolean;
}) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blockExtensions,
    content: block.content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[1.5em] py-1 px-2 [&_p]:my-0 [&_p:last-child]:mb-0",
      },
      handleKeyDown: (view, event) => {
        // Enter at end creates new block
        if (event.key === "Enter" && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const isAtEnd =
            $from.parentOffset === $from.parent.content.size &&
            $from.parent.textContent.trim() !== "";

          if (isAtEnd) {
            event.preventDefault();
            onAddAfter(block.id);
            return true;
          }
        }

        // Backspace at start of empty block deletes it
        if (event.key === "Backspace") {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const isEmpty = $from.parent.textContent.trim() === "";
          const isAtStart = $from.parentOffset === 0;

          if (isEmpty && isAtStart && !isFirst) {
            event.preventDefault();
            onDelete(block.id);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        onUpdate(block.id, html);
      }, 300);
    },
  });

  // Auto focus
  useEffect(() => {
    if (editor && autoFocus) {
      setTimeout(() => {
        editor.commands.focus("end");
      }, 50);
    }
  }, [editor, autoFocus]);

  // Update content when block changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHtml = editor.getHTML();
      if (block.content !== currentHtml) {
        editor.commands.setContent(block.content);
      }
    }
  }, [block.content, editor]);

  // Floating toolbar
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setShowToolbar(false);
        return;
      }

      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const top = Math.min(start.top, end.top) + window.scrollY - 50;
      const left = (start.left + end.left) / 2 + window.scrollX;

      if (toolbarRef.current) {
        const width = toolbarRef.current.offsetWidth;
        const centeredLeft = left - width / 2;
        setToolbarPos({
          top: Math.max(10, top),
          left: Math.max(
            10,
            Math.min(centeredLeft, window.innerWidth - width - 10)
          ),
        });
        setShowToolbar(true);
      }
    };

    editor.on("selectionUpdate", updateToolbar);
    return () => {
      editor.off("selectionUpdate", updateToolbar);
    };
  }, [editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [editor]);

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <div ref={containerRef} className="relative group">
      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg shadow-lg border"
          style={{
            top: `${toolbarPos.top}px`,
            left: `${toolbarPos.left}px`,
            backgroundColor: "var(--sidebar-bg)",
            backdropFilter: "blur(12px)",
            borderColor: "var(--border-color)",
            transform: "translateX(-50%)",
          }}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Negrito"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Itálico"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Sublinhado"
          >
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Tachado"
          >
            <Strikethrough size={14} />
          </ToolbarButton>
          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Código"
          >
            <Code size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              const url = window.prompt("URL:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive("link")}
            title="Link"
          >
            <Link size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div
        className={`rounded transition-colors ${
          isEmpty ? "hover:bg-hover/20" : ""
        }`}
      >
        <EditorContent editor={editor} />
        {isEmpty && (
          <div
            className="absolute pointer-events-none text-sm opacity-40 px-2"
            style={{ top: "0.25rem", left: "0.5rem" }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-hover" : "hover:bg-hover/50"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}
