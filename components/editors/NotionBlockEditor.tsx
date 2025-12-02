"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TiptapLink from "@tiptap/extension-link";
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
} from "lucide-react";

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

// Command menu items
function getCommandItems(): CommandItem[] {
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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(content);

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
                      <span className="text-foreground/40">{placeholder}</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  autoFocus: boolean;
  isFirst: boolean;
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
}) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPos, setCommandMenuPos] = useState({ top: 0, left: 0 });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blockExtensions,
    content: block.content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[1.5em] py-0.5 px-2 leading-normal [&_p]:my-0 [&_p:last-child]:mb-0 [&_p]:leading-[1.6]",
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;
        const textBeforeCursor = $from.parent.textContent.slice(
          0,
          $from.parentOffset
        );

        // Command menu navigation
        if (showCommandMenu && editor) {
          const commands = getCommandItems();

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
              selectedCommand.action(editor);
              setShowCommandMenu(false);
              // Clear the "/" from the editor
              const { from } = selection;
              editor.commands.setTextSelection({ from: from - 1, to: from });
              editor.commands.deleteSelection();
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
        if (event.key === "/" && textBeforeCursor.trim() === "" && editor) {
          event.preventDefault();
          const coords = view.coordsAtPos($from.pos);
          setCommandMenuPos({
            top: coords.top + window.scrollY,
            left: coords.left + window.scrollX,
          });
          setShowCommandMenu(true);
          setSelectedCommandIndex(0);
          return true;
        }

        // Enter at end creates new block
        if (event.key === "Enter" && !event.shiftKey) {
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
              backgroundColor: "var(--sidebar-bg)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="py-1 max-h-80 overflow-y-auto">
              {editor &&
                getCommandItems().map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => {
                      command.action(editor);
                      setShowCommandMenu(false);
                      // Clear the "/" from the editor
                      const { from } = editor.state.selection;
                      editor.commands.setTextSelection({
                        from: from - 1,
                        to: from,
                      });
                      editor.commands.deleteSelection();
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
              backgroundColor: "var(--sidebar-bg)",
              backdropFilter: "blur(12px)",
              borderColor: "var(--border-color)",
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
              style={{ top: "0.5rem", left: "0.5rem" }}
            >
              {placeholder}
            </div>
          )}
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
