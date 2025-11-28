"use client";

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
  Palette,
  MoreHorizontal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onSave: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onSave,
  placeholder = "Escreva algo...",
}: RichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const isEditingRef = useRef(false);
  const lastSavedContentRef = useRef(content);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        underline: false,
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
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 [&_p]:my-0 [&_p:last-child]:mb-0 [&_*:last-child]:mb-0",
        style: "margin-bottom: 0; padding-bottom: 0;",
      },
    },
    onUpdate: ({ editor }) => {
      // Update content in real-time while editing with debounce
      const html = editor.getHTML();

      // Clear previous timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Debounce the save to avoid too many updates
      updateTimeoutRef.current = setTimeout(() => {
        if (isEditingRef.current && html !== lastSavedContentRef.current) {
          lastSavedContentRef.current = html;
          onSave(html);
        }
      }, 300); // 300ms debounce
    },
    onBlur: ({ editor, event }) => {
      // Don't close editor if focus moved to an element within the editor container
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      if (
        relatedTarget &&
        editorContainerRef.current &&
        editorContainerRef.current.contains(relatedTarget)
      ) {
        return;
      }

      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      const html = editor.getHTML();
      if (html !== lastSavedContentRef.current) {
        lastSavedContentRef.current = html;
        onSave(html);
      }
      isEditingRef.current = false;
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (editor && isEditing) {
      isEditingRef.current = true;
      editor.commands.focus();
    }
  }, [isEditing, editor]);

  // Handle floating toolbar positioning
  useEffect(() => {
    if (!editor || !isEditing) return;

    const updateToolbarPosition = () => {
      const { from, to } = editor.state.selection;
      const isEmpty = from === to;

      if (isEmpty) {
        setShowFloatingToolbar(false);
        return;
      }

      // Get selection coordinates
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate toolbar position (above selection, centered)
      const selectionTop = Math.min(start.top, end.top);
      const selectionLeft = (start.left + end.left) / 2;

      // Calculate position relative to viewport
      const top = selectionTop + window.scrollY - 50; // 50px above selection
      const left = selectionLeft + window.scrollX;

      // Get toolbar width to center it properly
      if (floatingToolbarRef.current) {
        const toolbarWidth = floatingToolbarRef.current.offsetWidth;
        const centeredLeft = left - toolbarWidth / 2;

        // Ensure toolbar stays within viewport
        const viewportWidth = window.innerWidth;
        const minLeft = 10;
        const maxLeft = viewportWidth - toolbarWidth - 10;
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, centeredLeft));

        setToolbarPosition({
          top: Math.max(10, top),
          left: clampedLeft,
        });
        setShowFloatingToolbar(true);
      } else {
        setToolbarPosition({ top, left });
        setShowFloatingToolbar(true);
      }
    };

    // Update on selection change
    editor.on("selectionUpdate", updateToolbarPosition);
    editor.on("transaction", updateToolbarPosition);

    // Also update on scroll
    const handleScroll = () => {
      if (showFloatingToolbar) {
        updateToolbarPosition();
      }
    };

    window.addEventListener("scroll", handleScroll, true);

    // Initial check
    setTimeout(updateToolbarPosition, 0);

    return () => {
      editor.off("selectionUpdate", updateToolbarPosition);
      editor.off("transaction", updateToolbarPosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [editor, isEditing, showFloatingToolbar]);

  // Update editor content when prop changes (from external updates)
  // Only update if we're not currently editing and content actually changed
  useEffect(() => {
    if (!isEditingRef.current && editor) {
      const currentHtml = editor.getHTML();
      if (content !== currentHtml && content !== lastSavedContentRef.current) {
        editor.commands.setContent(content);
        lastSavedContentRef.current = content;
      }
    }
  }, [content, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  // Show read-only content when not editing
  if (!isEditing) {
    const htmlToShow =
      content || `<span class="opacity-40">${placeholder}</span>`;
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-text hover:bg-hover rounded px-2 py-1 transition-colors prose prose-sm max-w-none [&_p]:my-0 [&_p]:mb-0 [&_*]:mb-0 [&_*:last-child]:mb-0"
        style={{ marginBottom: "0 !important", paddingBottom: "0 !important" }}
        title="Clique para editar"
        dangerouslySetInnerHTML={{
          __html: htmlToShow,
        }}
        key={content}
      />
    );
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
      // Keep focus on editor after button click
      requestAnimationFrame(() => {
        editor.commands.focus();
      });
    };
  };

  return (
    <div
      ref={editorContainerRef}
      className="relative mb-0"
      style={{
        marginBottom: "0 !important",
      }}
    >
      {/* Floating Toolbar - Notion Style */}
      {showFloatingToolbar && isEditing && (
        <div
          ref={floatingToolbarRef}
          className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg shadow-lg border"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            backgroundColor: "var(--sidebar-bg)",
            backdropFilter: "blur(12px) saturate(180%)",
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
            borderColor: "var(--border-color)",
            transform: "translateX(-50%)",
            color: "var(--foreground)",
          }}
          onMouseDown={(e) => {
            // Only prevent default on the container, not on buttons
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          {/* Bold */}
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

          {/* Italic */}
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

          {/* Underline */}
          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleUnderline().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("underline") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Sublinhado (Cmd+U)"
          >
            <UnderlineIcon size={14} />
          </button>

          {/* Strikethrough */}
          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleStrike().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("strike") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Tachado (Cmd+Shift+S)"
          >
            <Strikethrough size={14} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Code */}
          <button
            onClick={handleToolbarAction(() => {
              editor.chain().focus().toggleCode().run();
            })}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("code") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Código (Cmd+E)"
          >
            <Code size={14} />
          </button>

          {/* Link */}
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
            title="Link (Cmd+K)"
          >
            <Link size={14} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Color Picker */}
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
                  borderColor: "var(--border-color)",
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
                      borderColor: "var(--border-color)",
                    }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* More Options */}
          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          <button
            onClick={handleToolbarAction(() => {})}
            className="p-1.5 rounded hover:bg-hover/50 transition-colors"
            title="Mais opções"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div
        className="border rounded-lg"
        style={{
          borderColor: isEditing ? "var(--border-color)" : "transparent",
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
