"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
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
  Palette,
  Plus,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface TextBlockProps {
  id: string;
  content: string;
  onUpdate: (id: string, content: string) => void;
  onAddBlock?: (afterId: string) => void;
  onDelete?: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isFirst?: boolean;
}

// Create extensions outside component to ensure single instance
const editorExtensions = [
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

export default function TextBlock({
  id,
  content,
  onUpdate,
  onAddBlock,
  onDelete,
  placeholder = "Digite '/' para comandos ou comece a escrever...",
  autoFocus = false,
  isFirst = false,
}: TextBlockProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showAddButton, setShowAddButton] = useState(false);
  const lastSavedContentRef = useRef(content);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[1.5em] py-1 px-2 [&_p]:my-0 [&_p:last-child]:mb-0 [&_*:last-child]:mb-0",
        style: "margin-bottom: 0; padding-bottom: 0;",
      },
      handleKeyDown: (
        view: {
          state: {
            selection: {
              $from: {
                parentOffset: number;
                parent: { content: { size: number }; textContent: string };
              };
            };
          };
        },
        event: KeyboardEvent
      ) => {
        // Create new block on Enter at end of content
        if (event.key === "Enter" && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;

          // Check if we're at the end of the document
          if ($from.parentOffset === $from.parent.content.size) {
            const isEmpty = $from.parent.textContent.trim() === "";

            // If empty, delete this block and create new one
            if (isEmpty && onDelete) {
              event.preventDefault();
              onDelete(id);
              if (onAddBlock) {
                setTimeout(() => onAddBlock(id), 0);
              }
              return true;
            }

            // If not empty, create new block after
            if (onAddBlock) {
              event.preventDefault();
              onAddBlock(id);
              return true;
            }
          }
        }

        // Delete block if empty and Backspace at start
        if (event.key === "Backspace") {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;

          if (
            $from.parentOffset === 0 &&
            $from.parent.textContent.trim() === "" &&
            !isFirst &&
            onDelete
          ) {
            event.preventDefault();
            onDelete(id);
            return true;
          }
        }

        return false;
      },
    }),
    [id, onAddBlock, onDelete, isFirst]
  );

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (html !== lastSavedContentRef.current) {
          lastSavedContentRef.current = html;
          onUpdate(id, html);
        }
      }, 300);
    },
    [id, onUpdate]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content,
    editorProps,
    onUpdate: handleUpdate,
  });

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        setTimeout(() => {
          editor.destroy();
        }, 0);
      }
    };
  }, [editor]);

  // Auto focus on mount if needed
  useEffect(() => {
    if (editor && autoFocus) {
      const timer = setTimeout(() => {
        editor.commands.focus("end");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, autoFocus]);

  // Update content when prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHtml = editor.getHTML();
      if (content !== currentHtml && content !== lastSavedContentRef.current) {
        editor.commands.setContent(content);
        lastSavedContentRef.current = content;
      }
    }
  }, [content, editor]);

  // Handle floating toolbar
  useEffect(() => {
    if (!editor) return;

    const updateToolbarPosition = () => {
      const { from, to } = editor.state.selection;
      const isEmpty = from === to;

      if (isEmpty) {
        setShowFloatingToolbar(false);
        return;
      }

      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      const selectionTop = Math.min(start.top, end.top);
      const selectionLeft = (start.left + end.left) / 2;

      const top = selectionTop + window.scrollY - 50;
      const left = selectionLeft + window.scrollX;

      if (floatingToolbarRef.current) {
        const toolbarWidth = floatingToolbarRef.current.offsetWidth;
        const centeredLeft = left - toolbarWidth / 2;
        const viewportWidth = window.innerWidth;
        const minLeft = 10;
        const maxLeft = viewportWidth - toolbarWidth - 10;
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, centeredLeft));

        setToolbarPosition({
          top: Math.max(10, top),
          left: clampedLeft,
        });
        setShowFloatingToolbar(true);
      }
    };

    editor.on("selectionUpdate", updateToolbarPosition);
    editor.on("transaction", updateToolbarPosition);

    const handleScroll = () => {
      if (showFloatingToolbar) {
        updateToolbarPosition();
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    setTimeout(updateToolbarPosition, 0);

    return () => {
      editor.off("selectionUpdate", updateToolbarPosition);
      editor.off("transaction", updateToolbarPosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [editor, showFloatingToolbar]);

  // Show add button on hover
  useEffect(() => {
    if (!editor) return;

    const handleMouseEnter = () => setShowAddButton(true);
    const handleMouseLeave = () => setShowAddButton(false);

    const container = editorContainerRef.current;
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const colors = [
    "#000000",
    "#374151",
    "#6B7280",
    "#9CA3AF",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F97316",
    "#14B8A6",
  ];

  const handleToolbarAction = (action: () => void) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
      requestAnimationFrame(() => {
        editor.commands.focus();
      });
    };
  };

  const isEmpty = editor.isEmpty;

  return (
    <div
      ref={editorContainerRef}
      className="relative group"
      style={{ minHeight: "1.5em" }}
    >
      {/* Add Block Button */}
      {showAddButton && onAddBlock && (
        <button
          onClick={() => onAddBlock(id)}
          className="absolute -left-8 top-0 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-hover"
          style={{ zIndex: 10 }}
          title="Adicionar bloco"
        >
          <Plus size={14} />
        </button>
      )}

      {/* Floating Toolbar */}
      {showFloatingToolbar && (
        <div
          ref={floatingToolbarRef}
          className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg shadow-lg border"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            backgroundColor: "var(--sidebar-bg)",
            backdropFilter: "blur(12px) saturate(180%)",
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
            borderColor: "var(--border)",
            transform: "translateX(-50%)",
            color: "var(--foreground)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleBold().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("bold") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Negrito (Cmd+B)"
          >
            <Bold size={14} />
          </button>

          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleItalic().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("italic") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Itálico (Cmd+I)"
          >
            <Italic size={14} />
          </button>

          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleUnderline().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("underline") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Sublinhado"
          >
            <UnderlineIcon size={14} />
          </button>

          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleStrike().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("strike") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Tachado"
          >
            <Strikethrough size={14} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border)" }}
          />

          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleCode().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("code") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Código"
          >
            <Code size={14} />
          </button>

          <button
            onClick={handleToolbarAction(() => {
              const url = window.prompt("Digite a URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("link") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Link"
          >
            <Link size={14} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border)" }}
          />

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className={`p-1.5 rounded transition-colors ${
                showColorPicker ? "bg-hover" : "hover:bg-hover/50"
              }`}
              title="Cor do Texto"
            >
              <Palette size={14} />
            </button>

            {showColorPicker && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 border rounded-lg shadow-lg z-10 grid grid-cols-6 gap-1"
                style={{
                  backgroundColor: "var(--sidebar-bg)",
                  backdropFilter: "blur(12px) saturate(180%)",
                  WebkitBackdropFilter: "blur(12px) saturate(180%)",
                  borderColor: "var(--border)",
                }}
              >
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color,
                      borderColor: "var(--border)",
                    }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div
        className={`rounded transition-colors ${
          isEmpty ? "hover:bg-hover/30" : ""
        }`}
        style={{
          borderColor: "transparent",
        }}
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
