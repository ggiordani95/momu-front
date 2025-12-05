"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";
import MarkdownIt from "markdown-it";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link,
  Plus,
  GripVertical,
  Type,
  List,
  Hash,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
  Youtube,
  X,
  SpellCheck,
  EyeOff,
} from "lucide-react";
import { createPortal } from "react-dom";

interface Block {
  id: string;
  content: string;
  type?: string; // Optional block type (heading, list, etc.)
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

interface NotionBlockEditorProps {
  content: string;
  onSave: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

interface UrlInputModalProps {
  type: "image" | "youtube";
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

// URL Input Modal Component
function UrlInputModal({ type, onConfirm, onCancel }: UrlInputModalProps) {
  const [url, setUrl] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      if (inputMode === "url" && inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [inputMode]);

  const handleCancel = useCallback(() => {
    setIsMounted(false);
    setUrl("");
    setInputMode("url");
    setIsUploading(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCancel]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Only allow image files
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione um arquivo de imagem válido.");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(
          "O arquivo é muito grande. Por favor, selecione uma imagem menor que 10MB."
        );
        return;
      }

      setIsUploading(true);

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            onConfirm(base64);
            handleCancel();
          }
        };
        reader.onerror = () => {
          alert("Erro ao ler o arquivo. Por favor, tente novamente.");
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } catch {
        alert("Erro ao processar o arquivo. Por favor, tente novamente.");
        setIsUploading(false);
      }
    },
    [onConfirm, handleCancel]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;
    onConfirm(url.trim());
    handleCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        opacity: isMounted ? 1 : 0,
        transition: "opacity 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
        style={{
          transform: isMounted ? "scale(1)" : "scale(0.95)",
          opacity: isMounted ? 1 : 0,
          transition: "all 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {type === "image" ? "Inserir Imagem" : "Inserir Vídeo do YouTube"}
          </h3>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground/60 hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "image" && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setInputMode("url");
                  setUrl("");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === "url"
                    ? "bg-blue-600 text-white"
                    : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("upload");
                  setUrl("");
                  setTimeout(() => fileInputRef.current?.click(), 50);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === "upload"
                    ? "bg-blue-600 text-white"
                    : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                }`}
              >
                Upload
              </button>
            </div>
          )}

          {inputMode === "url" ? (
            <div>
              <label
                htmlFor="url-input"
                className="block text-sm font-medium text-foreground/70 mb-2"
              >
                URL
              </label>
              <input
                ref={inputRef}
                id="url-input"
                type="url"
                value={url || ""}
                onChange={(e) => setUrl(e.target.value || "")}
                placeholder={
                  type === "image"
                    ? "https://exemplo.com/imagem.jpg"
                    : "https://youtube.com/watch?v=..."
                }
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancel();
                  }
                }}
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="file-input"
                className="block text-sm font-medium text-foreground/70 mb-2"
              >
                Selecionar Imagem
              </label>
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-border bg-background/50 hover:bg-background hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-foreground/70">
                      Processando...
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} className="text-foreground/40" />
                    <span className="text-sm text-foreground/70">
                      Clique para selecionar ou arraste uma imagem aqui
                    </span>
                    <span className="text-xs text-foreground/50">
                      Máximo 10MB
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {inputMode === "url" && (
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!url.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Inserir
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Parse content - support both JSON array, HTML, and Markdown
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
    // Not JSON, check if it's Markdown
    const trimmedContent = content.trim();

    // Check if content looks like Markdown (has markdown syntax)
    const hasMarkdownHeadings = /^#{1,6}\s/m.test(trimmedContent);
    const hasMarkdownLists =
      /^[-*+]\s/m.test(trimmedContent) || /^\d+\.\s/m.test(trimmedContent);
    const hasMarkdownFormatting =
      trimmedContent.includes("**") ||
      trimmedContent.includes("*") ||
      trimmedContent.includes("`");
    const isMarkdown =
      hasMarkdownHeadings || hasMarkdownLists || hasMarkdownFormatting;

    // If it's Markdown, convert to HTML
    if (isMarkdown && typeof window !== "undefined") {
      try {
        // Extract text from HTML if content is wrapped in HTML tags
        let cleanedText = trimmedContent;
        if (cleanedText.startsWith("<") && cleanedText.includes(">")) {
          cleanedText = cleanedText
            .replace(/<[^>]*>/g, "") // Remove all HTML tags
            .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
            .replace(/&amp;/g, "&") // Decode &amp;
            .replace(/&lt;/g, "<") // Decode &lt;
            .replace(/&gt;/g, ">") // Decode &gt;
            .replace(/&quot;/g, '"') // Decode &quot;
            .replace(/&#39;/g, "'") // Decode &#39;
            .trim();
        }

        // Normalize line breaks
        let normalizedText = cleanedText
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\n{3,}/g, "\n\n");

        // Ensure headings have proper line breaks before them
        normalizedText = normalizedText.replace(/([^\n])(\n*#+\s)/g, "$1\n$2");

        // Ensure list items have proper line breaks
        normalizedText = normalizedText.replace(
          /([^\n])(\n*[-*+]\s)/g,
          "$1\n$2"
        );
        normalizedText = normalizedText.replace(
          /([^\n])(\n*\d+\.\s)/g,
          "$1\n$2"
        );

        // Convert Markdown to HTML
        const md = new MarkdownIt({
          html: true,
          breaks: false,
          linkify: true,
          typographer: true,
        });

        const html = md.render(normalizedText);

        console.log(
          "[NotionBlockEditor] parseContent - Converted Markdown to HTML:",
          {
            originalLength: content.length,
            htmlLength: html.length,
            hasH1: html.includes("<h1"),
            hasH2: html.includes("<h2"),
          }
        );

        return [{ id: generateId(), content: html }];
      } catch (error) {
        console.error(
          "[NotionBlockEditor] parseContent - Error converting Markdown:",
          error
        );
        // Fallback: treat as HTML
        return [{ id: generateId(), content: content }];
      }
    }

    // Not Markdown, treat as HTML
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

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// YouTube Video Extension
const YouTubeExtension = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: 640,
      },
      height: {
        default: 360,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-type='youtube']",
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === "string") return false;
          const iframe = node.querySelector("iframe");
          return {
            src: iframe?.getAttribute("src") || "",
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    const videoId = extractYouTubeId(HTMLAttributes.src);
    if (!videoId) return ["div"];

    return [
      "div",
      { "data-type": "youtube", class: "youtube-wrapper" },
      [
        "iframe",
        {
          src: `https://www.youtube.com/embed/${videoId}`,
          width: HTMLAttributes.width || 640,
          height: HTMLAttributes.height || 360,
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          class: "rounded-lg w-full max-w-4xl",
        },
      ],
    ];
  },
  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({ node }: any) => {
      const dom = document.createElement("div");
      dom.className = "youtube-wrapper my-4";

      const iframe = document.createElement("iframe");
      const videoId = extractYouTubeId(node.attrs.src);
      if (videoId) {
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.width = node.attrs.width || "100%";
        iframe.height = node.attrs.height || "360";
        iframe.frameBorder = "0";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.className = "rounded-lg w-full max-w-4xl";

        dom.appendChild(iframe);
      }
      return { dom };
    };
  },
  addCommands() {
    return {
      setYouTubeVideo:
        (options: { src: string; width?: number; height?: number }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) => {
          const videoId = extractYouTubeId(options.src);
          if (!videoId) return false;

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: `https://www.youtube.com/embed/${videoId}`,
              width: options.width || 640,
              height: options.height || 360,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});

// Command menu items
function getCommandItems(
  onOpenImageModal: () => void,
  onOpenYouTubeModal: () => void,
  setCurrentEditor: (ed: Editor) => void
): CommandItem[] {
  return [
    {
      id: "heading1",
      label: "Título 1",
      description: "Título grande",
      icon: <Type size={18} />,
      action: (ed) => {
        ed.chain().focus().toggleHeading({ level: 1 }).run();
      },
    },
    {
      id: "heading2",
      label: "Título 2",
      description: "Título médio",
      icon: <Type size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleHeading({ level: 2 }).run();
        }
      },
    },
    {
      id: "heading3",
      label: "Título 3",
      description: "Título pequeno",
      icon: <Type size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleHeading({ level: 3 }).run();
        }
      },
    },
    {
      id: "bulletList",
      label: "Lista com marcadores",
      description: "Criar lista com marcadores",
      icon: <List size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleBulletList().run();
        }
      },
    },
    {
      id: "orderedList",
      label: "Lista numerada",
      description: "Criar lista numerada",
      icon: <Hash size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleOrderedList().run();
        }
      },
    },
    {
      id: "blockquote",
      label: "Citação",
      description: "Citar texto",
      icon: <Quote size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleBlockquote().run();
        }
      },
    },
    {
      id: "codeBlock",
      label: "Bloco de código",
      description: "Criar bloco de código",
      icon: <Code2 size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().toggleCodeBlock().run();
        }
      },
    },
    {
      id: "divider",
      label: "Divisor",
      description: "Linha divisória",
      icon: <Minus size={18} />,
      action: (ed) => {
        if (ed) {
          ed.chain().focus().setHorizontalRule().run();
        }
      },
    },
    {
      id: "image",
      label: "Imagem",
      description: "Inserir imagem por URL",
      icon: <ImageIcon size={18} />,
      action: (ed) => {
        if (ed) {
          setCurrentEditor(ed);
          onOpenImageModal();
        }
      },
    },
    {
      id: "youtube",
      label: "Vídeo do YouTube",
      description: "Inserir vídeo do YouTube",
      icon: <Youtube size={18} />,
      action: (ed) => {
        if (ed) {
          setCurrentEditor(ed);
          onOpenYouTubeModal();
        }
      },
    },
  ];
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
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: "max-w-full rounded-lg my-4",
    },
  }),
  YouTubeExtension,
];

export default function NotionBlockEditor({
  content,
  onSave,
  placeholder = "",
  autoFocus = false,
}: NotionBlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(content));
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [urlModalType, setUrlModalType] = useState<"image" | "youtube" | null>(
    null
  );
  const [currentEditor, setCurrentEditor] = useState<Editor | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(content);

  // Modal handlers
  const handleOpenImageModal = useCallback(() => {
    setUrlModalType("image");
  }, []);

  const handleOpenYouTubeModal = useCallback(() => {
    setUrlModalType("youtube");
  }, []);

  const handleUrlConfirm = useCallback(
    (url: string) => {
      if (!currentEditor) return;

      if (urlModalType === "image") {
        currentEditor.chain().focus().setImage({ src: url }).run();
      } else if (urlModalType === "youtube") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentEditor.chain().focus() as any)
          .setYouTubeVideo({ src: url })
          .run();
      }

      setUrlModalType(null);
      setCurrentEditor(null);
    },
    [currentEditor, urlModalType]
  );

  const handleUrlCancel = useCallback(() => {
    setUrlModalType(null);
    setCurrentEditor(null);
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const updated = arrayMove(items, oldIndex, newIndex);
        saveBlocks(updated);
        return updated;
      });
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {blocks.map((block, index) => (
              <SortableBlockItem
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onAddAfter={addBlockAfter}
                onDelete={deleteBlock}
                placeholder={placeholder}
                autoFocus={
                  autoFocus && (index === 0 || focusedBlockId === block.id)
                }
                isFirst={index === 0}
                onOpenImageModal={handleOpenImageModal}
                onOpenYouTubeModal={handleOpenYouTubeModal}
                setCurrentEditor={setCurrentEditor}
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
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="w-full max-w-4xl opacity-90 shadow-2xl bg-background border border-border rounded p-2">
              <div className="flex items-start gap-2">
                <div className="shrink-0 pt-1.5">
                  <GripVertical size={16} className="text-foreground/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="prose prose-sm max-w-none text-foreground line-clamp-3">
                    {(() => {
                      const activeBlock = blocks.find((b) => b.id === activeId);
                      return activeBlock?.content ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: activeBlock.content,
                          }}
                        />
                      ) : (
                        <span className="text-foreground/40">
                          {placeholder}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {urlModalType && (
        <UrlInputModal
          type={urlModalType as "image" | "youtube"}
          onConfirm={handleUrlConfirm}
          onCancel={handleUrlCancel}
        />
      )}
    </>
  );
}

// Sortable block wrapper
function SortableBlockItem({
  block,
  onUpdate,
  onAddAfter,
  onDelete,
  placeholder,
  autoFocus,
  isFirst,
  onOpenImageModal,
  onOpenYouTubeModal,
  setCurrentEditor,
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  autoFocus: boolean;
  isFirst: boolean;
  onOpenImageModal: () => void;
  onOpenYouTubeModal: () => void;
  setCurrentEditor: (ed: Editor) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(isDragging && {
      width: "100%",
      maxWidth: "100%",
    }),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "will-change-transform" : ""}
    >
      <BlockItem
        block={block}
        onUpdate={onUpdate}
        onAddAfter={onAddAfter}
        onDelete={onDelete}
        placeholder={placeholder}
        autoFocus={autoFocus}
        isFirst={isFirst}
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpenImageModal={onOpenImageModal}
        onOpenYouTubeModal={onOpenYouTubeModal}
        setCurrentEditor={setCurrentEditor}
      />
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
  dragHandleProps,
  onOpenImageModal,
  onOpenYouTubeModal,
  setCurrentEditor,
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  autoFocus: boolean;
  isFirst: boolean;
  dragHandleProps?: {
    [key: string]: unknown;
  };
  onOpenImageModal: () => void;
  onOpenYouTubeModal: () => void;
  setCurrentEditor: (ed: Editor) => void;
}) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPos, setCommandMenuPos] = useState({ top: 0, left: 0 });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const setCurrentEditorRef = useRef(setCurrentEditor);

  // Update ref when setCurrentEditor changes
  useEffect(() => {
    setCurrentEditorRef.current = setCurrentEditor;
  }, [setCurrentEditor]);

  // Create handleKeyDown with proper closure
  const handleKeyDown = useCallback(
    (
      view: {
        state: {
          selection: {
            $from: {
              parent: { textContent: string; content: { size: number } };
              parentOffset: number;
            };
            from: number;
          };
        };
        coordsAtPos: (pos: number) => { top: number; left: number };
      },
      event: KeyboardEvent
    ) => {
      const editor = editorRef.current;
      if (!editor) return false;

      const { state } = view;
      const { selection } = state;
      const { $from } = selection;
      const textBeforeCursor = $from.parent.textContent.slice(
        0,
        $from.parentOffset
      );

      // Command menu navigation
      if (showCommandMenu) {
        if (setCurrentEditorRef.current) {
          setCurrentEditorRef.current(editor);
        }
        const commands = getCommandItems(
          onOpenImageModal,
          onOpenYouTubeModal,
          (ed: Editor) => {
            if (setCurrentEditorRef.current) {
              setCurrentEditorRef.current(ed);
            }
          }
        );

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev < commands.length - 1 ? prev + 1 : prev
          );
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const selectedCommand = commands[selectedCommandIndex];
          if (selectedCommand) {
            setShowCommandMenu(false);
            // Clear the "/" from the editor first if it exists
            const currentText = editor.getText();
            if (currentText.includes("/")) {
              const { from } = selection;
              editor.commands.setTextSelection({
                from: Math.max(0, from - 1),
                to: from,
              });
              editor.commands.deleteSelection();
            }
            // Apply the command
            requestAnimationFrame(() => {
              selectedCommand.action(editor);
            });
          }
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setShowCommandMenu(false);
          // Clear the "/" from the editor
          const { from } = selection;
          editor.commands.setTextSelection({ from: from - 1, to: from });
          editor.commands.deleteSelection();
          return true;
        }
      }

      // Detect "/" command trigger
      if (event.key === "/" && textBeforeCursor.trim() === "") {
        event.preventDefault();
        const coords = view.coordsAtPos(selection.from);
        setCommandMenuPos({
          top: coords.top + window.scrollY,
          left: coords.left + window.scrollX,
        });
        setShowCommandMenu(true);
        setSelectedCommandIndex(0);
        return true;
      }

      // Enter at end creates new block (only if not in a list)
      if (event.key === "Enter" && !event.shiftKey) {
        const isAtEnd =
          $from.parentOffset === $from.parent.content.size &&
          $from.parent.textContent.trim() !== "";

        // Check if we're inside a list (bulletList or orderedList)
        const isInList =
          editor.isActive("bulletList") || editor.isActive("orderedList");

        // Only create new block if at end AND not in a list
        // If in a list, let Tiptap handle it (creates new list item)
        if (isAtEnd && !isInList) {
          event.preventDefault();
          onAddAfter(block.id);
          return true;
        }
        // If in a list, don't prevent default - let Tiptap handle Enter normally
      }

      // Backspace at start of empty block deletes it
      if (event.key === "Backspace") {
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
    [
      showCommandMenu,
      selectedCommandIndex,
      onOpenImageModal,
      onOpenYouTubeModal,
      onAddAfter,
      onDelete,
      block.id,
      isFirst,
    ]
  );

  // Handle paste - convert Markdown to HTML
  const handlePaste = useCallback(
    (
      view: {
        state: {
          selection: { from: number; to: number };
        };
      },
      event: ClipboardEvent
    ) => {
      const editor = editorRef.current;
      if (!editor) return false;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return false;

      const pastedText = clipboardData.getData("text/plain");
      if (!pastedText || !pastedText.trim()) return false;

      // Check if the pasted text looks like Markdown
      // More specific check for Markdown patterns
      const hasMarkdownHeadings =
        /^#{1,6}\s/m.test(pastedText) || /\n#{1,6}\s/m.test(pastedText);
      const hasMarkdownLists =
        /^[-*+]\s/m.test(pastedText) ||
        /^\d+\.\s/m.test(pastedText) ||
        /\n[-*+]\s/m.test(pastedText) ||
        /\n\d+\.\s/m.test(pastedText);
      const hasMarkdownFormatting =
        pastedText.includes("**") ||
        pastedText.includes("*") ||
        pastedText.includes("`");

      // Check for structured content (like GPT responses with emojis and formatting)
      const hasEmojisWithStructure = /[🧘🌏📘🔹❌🎯🏛️🧩🟢✔️🟡🔴⚪🟣🔵🟠]/u.test(
        pastedText
      );
      const hasMultipleLines = pastedText.split("\n").length > 3;
      const hasStructuredFormat =
        /^[A-Z][^.!?]*\n\n/m.test(pastedText) || // Title-like lines followed by blank lines
        /^[🧘🌏📘🔹❌🎯🏛️🧩🟢✔️]/.test(pastedText); // Starts with emoji

      const looksLikeMarkdown =
        hasMarkdownHeadings ||
        hasMarkdownLists ||
        hasMarkdownFormatting ||
        (hasEmojisWithStructure && hasMultipleLines) ||
        (hasStructuredFormat && hasMultipleLines);

      if (looksLikeMarkdown) {
        event.preventDefault();

        // Extract text from HTML if content is wrapped in HTML tags
        let cleanedText = pastedText.trim();
        if (cleanedText.startsWith("<") && cleanedText.includes(">")) {
          cleanedText = cleanedText
            .replace(/<[^>]*>/g, "") // Remove all HTML tags
            .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
            .replace(/&amp;/g, "&") // Decode &amp;
            .replace(/&lt;/g, "<") // Decode &lt;
            .replace(/&gt;/g, ">") // Decode &gt;
            .replace(/&quot;/g, '"') // Decode &quot;
            .replace(/&#39;/g, "'") // Decode &#39;
            .trim();
        }

        // Normalize line breaks - ensure headings have proper spacing
        // Preserve indentation (leading spaces/tabs) before normalizing
        let normalizedText = cleanedText
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\n{3,}/g, "\n\n");

        // Convert leading spaces/tabs to non-breaking spaces or preserve them
        // This will be handled by markdown-it and CSS white-space: pre-wrap

        // Convert GPT-style structured text to Markdown
        // Lines starting with emoji + text that looks like headings become headings
        normalizedText = normalizedText.replace(
          /^([🧘🌏📘🔹❌🎯🏛️🧩🟢✔️🟡🔴⚪🟣🔵🟠][^\n]*?)(\n|$)/gm,
          (match, content) => {
            // If it looks like a heading (short line, ends with ? or :, or has bold formatting, or is followed by content)
            const trimmedContent = content.trim();
            if (
              trimmedContent.length < 100 &&
              (trimmedContent.endsWith("?") ||
                trimmedContent.endsWith(":") ||
                trimmedContent.includes("**") ||
                trimmedContent.match(/^[🧘🌏📘🔹❌🎯🏛️🧩🟢✔️]/))
            ) {
              // Remove bold formatting if present and convert to heading
              const headingText = trimmedContent.replace(/\*\*/g, "").trim();
              return `## ${headingText}\n`;
            }
            return match;
          }
        );

        // Also convert lines that are questions or section titles (even without emojis)
        normalizedText = normalizedText.replace(
          /^([A-Z][^.!?\n]{0,80}[?:])\s*$/gm,
          (match, content) => {
            // If it's a short line ending with ? or :, make it a heading
            if (content.length < 80 && !content.includes("\n")) {
              return `## ${content}\n`;
            }
            return match;
          }
        );

        // Convert numbered lists with emojis to proper Markdown lists
        normalizedText = normalizedText.replace(
          /^(\d+)\.\s*([🧘🌏📘🔹❌🎯🏛️🧩🟢✔️🟡🔴⚪🟣🔵🟠][^\n]*)/gm,
          "$1. $2"
        );

        // Ensure headings have proper line breaks before them
        normalizedText = normalizedText.replace(/([^\n])(\n*#+\s)/g, "$1\n$2");

        // Ensure list items have proper line breaks
        normalizedText = normalizedText.replace(
          /([^\n])(\n*[-*+]\s)/g,
          "$1\n$2"
        );
        normalizedText = normalizedText.replace(
          /([^\n])(\n*\d+\.\s)/g,
          "$1\n$2"
        );

        console.log("[NotionBlockEditor] Paste - Normalized Markdown:", {
          length: normalizedText.length,
          first300: normalizedText.substring(0, 300),
          hasH1: normalizedText.includes("# "),
          hasH2: normalizedText.includes("## "),
        });

        // Convert Markdown to HTML
        const md = new MarkdownIt({
          html: true,
          breaks: false, // Don't convert single \n to <br>, preserve structure
          linkify: true,
          typographer: true,
        });

        // Render Markdown to HTML
        let html = md.render(normalizedText);

        // Preserve indentation by converting leading spaces in paragraphs to padding
        html = html.replace(/<p>(\s+)([^<]+)/g, (match, spaces, content) => {
          const indentLevel = spaces.length;
          if (indentLevel > 0) {
            // Use padding-left to create visual indentation
            return `<p style="padding-left: ${
              indentLevel * 1.5
            }em;">${content}`;
          }
          return match;
        });

        console.log("[NotionBlockEditor] Paste - Rendered HTML:", {
          length: html.length,
          first500: html.substring(0, 500),
          hasH1: html.includes("<h1"),
          hasH2: html.includes("<h2"),
          hasH3: html.includes("<h3"),
          h1Count: (html.match(/<h1>/g) || []).length,
          h2Count: (html.match(/<h2>/g) || []).length,
        });

        // Insert the HTML into the editor at the cursor position
        const { from, to } = view.state.selection;

        // Delete selected content if any
        if (from !== to) {
          editor.commands.deleteRange({ from, to });
        }

        // Use insertContent - Tiptap will parse HTML correctly
        // The HTML from markdown-it should be valid and parseable
        try {
          // Clear current block content first if it's empty or just whitespace
          const currentContent = editor.getText().trim();
          if (!currentContent || currentContent.length === 0) {
            editor.commands.clearContent();
          }

          // Insert the HTML content
          // Tiptap's insertContent should automatically parse HTML elements
          editor.commands.insertContent(html, {
            parseOptions: {
              preserveWhitespace: "full",
            },
          });

          // Verify the content was inserted correctly
          requestAnimationFrame(() => {
            const insertedHTML = editor.getHTML();
            const insertedText = editor.getText();

            console.log(
              "[NotionBlockEditor] Paste - Content inserted, verification:",
              {
                htmlLength: insertedHTML.length,
                textLength: insertedText.length,
                editorHTML: insertedHTML.substring(0, 500),
                hasH1: insertedHTML.includes("<h1"),
                hasH2: insertedHTML.includes("<h2"),
                hasH3: insertedHTML.includes("<h3"),
                hasP: insertedHTML.includes("<p"),
                hasUl: insertedHTML.includes("<ul"),
                editorText: insertedText.substring(0, 200),
                // Check if headings are actually in the editor
                h1Elements: insertedHTML.match(/<h1[^>]*>.*?<\/h1>/g) || [],
                h2Elements: insertedHTML.match(/<h2[^>]*>.*?<\/h2>/g) || [],
                h3Elements: insertedHTML.match(/<h3[^>]*>.*?<\/h3>/g) || [],
              }
            );
          });
        } catch (error) {
          console.error(
            "[NotionBlockEditor] Paste - Error inserting content:",
            error
          );
          // Fallback: insert as plain text if HTML insertion fails
          editor.commands.insertContent(pastedText);
        }

        return true;
      }

      return false;
    },
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blockExtensions,
    content: block.content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[1.5em] py-0.5 px-4 leading-normal [&_p]:my-0 [&_p]:last-child]:mb-0 [&_p]:leading-[1.6] [&_ul]:list-disc [&_ol]:list-decimal [&_li]:list-item",
        spellcheck: spellcheckEnabled ? "true" : "false",
      },
      handleKeyDown,
      handlePaste,
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

  // Update spellcheck attribute when state changes
  useEffect(() => {
    if (!editor) return;
    const editorElement = editor.view.dom;
    if (editorElement) {
      editorElement.setAttribute("spellcheck", spellcheckEnabled.toString());
    }
  }, [editor, spellcheckEnabled]);

  // Update editor ref when editor changes
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

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

  // Floating toolbar - show when text is selected
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      try {
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (!hasSelection) {
          setShowToolbar(false);
          return;
        }

        // Don't show toolbar for images or YouTube videos
        const { state } = editor;
        const { $from } = state.selection;
        const node = $from.node();
        const parent = $from.parent;

        // Check if selection is inside an image or YouTube node
        const isImageSelected =
          editor.isActive("image") ||
          node.type.name === "image" ||
          parent.type.name === "image" ||
          $from.nodeAfter?.type.name === "image" ||
          $from.nodeBefore?.type.name === "image";

        const isYouTubeSelected =
          editor.isActive("youtube") ||
          node.type.name === "youtube" ||
          parent.type.name === "youtube" ||
          $from.nodeAfter?.type.name === "youtube" ||
          $from.nodeBefore?.type.name === "youtube";

        if (isImageSelected || isYouTubeSelected) {
          setShowToolbar(false);
          return;
        }

        // Get selection coordinates
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        // Position toolbar above selection
        const top = Math.min(start.top, end.top) + window.scrollY - 50;
        const left = (start.left + end.left) / 2 + window.scrollX;

        // Update position after toolbar is rendered
        requestAnimationFrame(() => {
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
          } else {
            // If toolbar ref is not ready, show it anyway and position will update
            setShowToolbar(true);
            setToolbarPos({
              top: Math.max(10, top),
              left: left,
            });
          }
        });
      } catch {
        // Silently handle errors
        setShowToolbar(false);
      }
    };

    // Listen to selection changes
    editor.on("selectionUpdate", updateToolbar);
    editor.on("transaction", updateToolbar);
    editor.on("focus", updateToolbar);

    // Also check on mouse up (when user finishes selecting)
    const handleMouseUp = () => {
      setTimeout(updateToolbar, 50);
    };

    // Check on selection change (for programmatic selections)
    const handleSelectionChange = () => {
      setTimeout(updateToolbar, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);

    // Initial check
    updateToolbar();

    return () => {
      editor.off("selectionUpdate", updateToolbar);
      editor.off("transaction", updateToolbar);
      editor.off("focus", updateToolbar);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
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
    <div ref={containerRef} className="relative group flex items-start gap-2">
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pt-1.5 touch-none"
        style={{ cursor: dragHandleProps ? "grab" : "default" }}
      >
        <GripVertical
          size={16}
          className="text-foreground/30 hover:text-foreground/60 transition-colors pointer-events-none"
        />
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative">
        {/* Command Menu */}
        {showCommandMenu && (
          <div
            ref={commandMenuRef}
            className="fixed z-50 w-64 rounded-lg shadow-lg border overflow-hidden"
            style={{
              top: `${commandMenuPos.top + 20}px`,
              left: `${commandMenuPos.left}px`,
              backgroundColor: "var(--sidebar)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
            }}
          >
            <div className="py-1 max-h-80 overflow-y-auto">
              {editor &&
                getCommandItems(
                  onOpenImageModal,
                  onOpenYouTubeModal,
                  setCurrentEditor
                ).map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => {
                      if (editor) {
                        setShowCommandMenu(false);
                        // Clear the "/" from the editor first if it exists
                        const currentContent = editor.getText();
                        if (currentContent.includes("/")) {
                          const { from } = editor.state.selection;
                          const slashIndex = currentContent.lastIndexOf("/");
                          if (slashIndex !== -1) {
                            editor.commands.setTextSelection({
                              from: Math.max(0, from - 1),
                              to: from,
                            });
                            editor.commands.deleteSelection();
                          }
                        }
                        // Apply the command
                        requestAnimationFrame(() => {
                          command.action(editor);
                        });
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-hover/50 transition-colors ${
                      selectedCommandIndex === index ? "bg-hover/30" : ""
                    }`}
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                  >
                    <div className="shrink-0 text-foreground/70">
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {command.label}
                      </div>
                      <div className="text-xs text-foreground/50 truncate">
                        {command.description}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Floating Toolbar */}
        {showToolbar && (
          <div
            ref={toolbarRef}
            className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg shadow-lg border"
            style={{
              top: `${toolbarPos.top}px`,
              left: `${toolbarPos.left}px`,
              backgroundColor: "var(--sidebar)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border)",
              transform: "translateX(-50%)",
            }}
          >
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Negrito (Ctrl+B)"
            >
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Itálico (Ctrl+I)"
            >
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Sublinhado (Ctrl+U)"
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
              style={{ backgroundColor: "var(--border)" }}
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
            <div
              className="w-px h-4 mx-0.5"
              style={{ backgroundColor: "var(--border)" }}
            />
            <ToolbarButton
              onClick={() => {
                setSpellcheckEnabled(!spellcheckEnabled);
              }}
              active={!spellcheckEnabled}
              title={
                spellcheckEnabled
                  ? "Desativar correção ortográfica"
                  : "Ativar correção ortográfica"
              }
            >
              {spellcheckEnabled ? (
                <SpellCheck size={14} />
              ) : (
                <EyeOff size={14} />
              )}
            </ToolbarButton>
          </div>
        )}

        {/* Editor */}
        <div
          className={`rounded transition-colors ${
            isEmpty ? "hover:bg-hover/20 notion-empty-block-wrapper" : ""
          }`}
          data-placeholder={isEmpty ? placeholder : undefined}
        >
          <EditorContent editor={editor} />
        </div>
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
