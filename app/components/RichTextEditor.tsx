"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
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
  const isEditingRef = useRef(false);
  const lastSavedContentRef = useRef(content);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3",
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
        className="cursor-text hover:bg-hover rounded px-2 py-1 transition-colors min-h-[60px] prose prose-sm max-w-none"
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

  return (
    <div
      ref={editorContainerRef}
      className="border rounded-lg"
      style={{ borderColor: "var(--border-color)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 p-2 border-b flex-wrap"
        style={{
          borderColor: "var(--border-color)",
          backgroundColor: "var(--sidebar-bg)",
        }}
      >
        {/* Text Formatting */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBold().run();
            // Keep focus on editor after button click
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive("bold") ? "bg-blue-100 dark:bg-blue-900/30" : ""
          }`}
          title="Negrito (Cmd+B)"
        >
          <Bold size={16} />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleItalic().run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive("italic") ? "bg-blue-100 dark:bg-blue-900/30" : ""
          }`}
          title="Itálico (Cmd+I)"
        >
          <Italic size={16} />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleUnderline().run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive("underline")
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Sublinhado (Cmd+U)"
        >
          <UnderlineIcon size={16} />
        </button>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* Headings */}
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 })
                .run();
            }
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          onBlur={(e) => {
            // Prevent closing editor when selecting from dropdown
            e.stopPropagation();
          }}
          className="px-2 py-1 rounded text-sm border-0 bg-transparent hover:bg-[var(--hover-bg)]"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
              ? "3"
              : "0"
          }
        >
          <option value="0">Normal</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
        </select>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* Lists */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBulletList().run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive("bulletList")
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Lista"
        >
          <List size={16} />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleOrderedList().run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive("orderedList")
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Lista Numerada"
        >
          <ListOrdered size={16} />
        </button>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* Alignment */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign("left").run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive({ textAlign: "left" })
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Alinhar à Esquerda"
        >
          <AlignLeft size={16} />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign("center").run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive({ textAlign: "center" })
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Centralizar"
        >
          <AlignCenter size={16} />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign("right").run();
            setTimeout(() => {
              editor.commands.focus();
            }, 0);
          }}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] ${
            editor.isActive({ textAlign: "right" })
              ? "bg-blue-100 dark:bg-blue-900/30"
              : ""
          }`}
          title="Alinhar à Direita"
        >
          <AlignRight size={16} />
        </button>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded hover:bg-[var(--hover-bg)]"
            title="Cor do Texto"
          >
            <Palette size={16} />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-10 grid grid-cols-6 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
