"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  List,
  Hash,
  Quote,
  Code2,
  Minus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Type,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import type { HierarchicalFile, File } from "@/lib/types";
import { markdownToHtml } from "@/lib/utils/markdownToHtml";
import { FileLinkPicker } from "@/components/FileLinkPicker";

// Custom FontSize extension
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize?.replace("px", "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

interface PageEditorProps {
  file: HierarchicalFile;
  onBack: () => void;
  onUpdate: (id: string, field: "title" | "content", value: string) => void;
  isNew?: boolean;
}

export default function PageEditor({
  file,
  onUpdate,
  onBack,
  isNew = false,
}: PageEditorProps) {
  const [title, setTitle] = useState(file.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isTitleEditing, setIsTitleEditing] = useState(isNew);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const blockMenuRef = useRef<HTMLDivElement>(null);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const fontSizeMenuRef = useRef<HTMLDivElement>(null);
  const [showFileLinkPicker, setShowFileLinkPicker] = useState(false);

  // Helper function to convert markdown or \n to HTML breaks
  const convertNewlinesToHTML = (content: string): string => {
    if (!content) return "<p></p>";

    // If already HTML without \n, return as is
    if (
      content.includes("<") &&
      content.includes(">") &&
      !content.includes("\\n") &&
      !content.includes("\n") &&
      !content.includes("#") &&
      !content.includes("*") &&
      !content.includes("`") &&
      !content.includes("](")
    ) {
      return content;
    }

    // Check if content looks like markdown (has markdown syntax)
    const hasMarkdownSyntax =
      content.includes("#") || // Headers
      content.includes("**") || // Bold
      content.includes("*") || // Italic or lists
      content.includes("`") || // Code
      content.includes("](") || // Links
      content.includes(">") || // Blockquotes
      content.includes("- ") || // Lists
      content.includes("1. "); // Numbered lists

    // If it looks like markdown, convert it
    if (hasMarkdownSyntax) {
      try {
        const html = markdownToHtml(content);
        return html || "<p></p>";
      } catch (error) {
        console.error("Error converting markdown to HTML:", error);
        // Fall through to regular conversion
      }
    }

    // Handle both literal \n (escaped) and actual newlines
    let processedContent = content;

    // First, handle JSON-escaped newlines (\\n)
    // Then handle literal string newlines (\n)
    // This handles cases where \n comes as a string literal "\\n" from JSON
    processedContent = processedContent
      .replace(/\\n/g, "\n") // Replace \\n with actual newline
      .replace(/\\r\\n/g, "\n") // Replace \r\n with newline
      .replace(/\\r/g, "\n"); // Replace \r with newline

    // Split by newlines and create paragraphs
    const lines = processedContent.split("\n");

    if (lines.length === 0) return "<p></p>";

    // Convert each line to a paragraph, filtering out empty lines at start/end
    const nonEmptyLines = lines
      .map((line) => line.trim())
      .filter((line, index, arr) => {
        // Keep all non-empty lines
        if (line) return true;
        // Keep empty lines only if they're in the middle (not at start or end)
        return index > 0 && index < arr.length - 1;
      });

    // If no content, return single empty paragraph
    if (nonEmptyLines.length === 0) return "<p></p>";

    // Convert to paragraphs
    const paragraphs = nonEmptyLines
      .map((line) => {
        // Empty lines in the middle become breaks
        if (!line) {
          return "<p><br></p>";
        }
        return `<p>${line}</p>`;
      })
      .join("");

    return paragraphs;
  };

  // Editor for content
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          paragraph: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          heading: {
            levels: [1, 2, 3],
            HTMLAttributes: {
              class: "block-item",
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          horizontalRule: {
            HTMLAttributes: {
              class: "block-item",
            },
          },
          underline: false,
          link: false,
        }),
        UnderlineExtension,
        TextStyle,
        FontSize,
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: "max-w-full rounded-lg my-4",
          },
        }),
        TiptapLink.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline cursor-pointer",
          },
        }),
      ],
      content: convertNewlinesToHTML(file.content || ""),
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none focus:outline-none min-h-[200px] [&_.block-item]:my-1 [&_.block-item]:px-2 [&_.block-item]:rounded [&_.block-item:hover]:bg-hover/30 [&_.block-item]:transition-colors [&_.block-item]:cursor-text",
        },
        handlePaste: (view, event) => {
          const items = Array.from(event.clipboardData?.items || []);

          for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
              event.preventDefault();
              const file = item.getAsFile();

              if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                  const base64 = readerEvent.target?.result as string;
                  if (base64) {
                    editor?.chain().focus().setImage({ src: base64 }).run();
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
          }
          return false;
        },
        handleDrop: (view, event) => {
          const files = Array.from(event.dataTransfer?.files || []);

          for (const file of files) {
            if (file.type.indexOf("image") !== -1) {
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const base64 = readerEvent.target?.result as string;
                if (base64) {
                  // Get drop position
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });
                  if (coordinates) {
                    editor
                      ?.chain()
                      .focus()
                      .setTextSelection(coordinates.pos)
                      .setImage({ src: base64 })
                      .run();
                  } else {
                    editor?.chain().focus().setImage({ src: base64 }).run();
                  }
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
          return false;
        },
        handleKeyDown: (view, event) => {
          // Handle Escape key to close menu and remove '/'
          if (event.key === "Escape" && showBlockMenu) {
            event.preventDefault();
            const { from } = view.state.selection;
            const $from = view.state.doc.resolve(from);
            const parent = $from.parent;

            if (!parent) {
              setShowBlockMenu(false);
              return true;
            }

            const blockText = parent.textContent || "";

            // Remove '/' if present
            if (blockText.trim().startsWith("/") && $from.parentOffset <= 1) {
              editor
                ?.chain()
                .focus()
                .setTextSelection({ from: from - 1, to: from })
                .deleteSelection()
                .run();
            }

            setShowBlockMenu(false);
            return true;
          }

          // Show block menu on '/' only if it's at the start of a line
          if (
            event.key === "/" &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            const { from } = view.state.selection;
            const $from = view.state.doc.resolve(from);
            const parent = $from.parent;

            // Only show menu if '/' is at the start of a block
            if (
              !parent ||
              $from.parentOffset === 0 ||
              (parent.textContent || "").trim() === ""
            ) {
              // Don't prevent default - let the '/' be inserted
              // Then check after a short delay if the content starts with '/'
              // Use a slightly longer delay to ensure the '/' is inserted first
              setTimeout(() => {
                // Use editor from closure, but verify it's still valid
                if (!editor || !editor.view) return;

                try {
                  const { from: newFrom } = editor.state.selection;
                  const $newFrom = editor.state.doc.resolve(newFrom);
                  const parent = $newFrom.parent;

                  // Check if parent exists before accessing textContent
                  if (!parent) return;

                  const blockText = parent.textContent || "";

                  // Check if the block starts with '/' and show menu
                  if (blockText.trim().startsWith("/")) {
                    const coords = editor.view.coordsAtPos(newFrom);
                    if (coords) {
                      setBlockMenuPosition({
                        top: coords.top + (window.scrollY || 0),
                        left: coords.left + (window.scrollX || 0),
                      });
                      setShowBlockMenu(true);
                    }
                  }
                } catch (error) {
                  console.warn(
                    "Error getting coordinates for block menu:",
                    error
                  );
                }
              }, 10); // Small delay to ensure '/' is inserted
            }
          }
          return false; // Always allow default behavior
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onUpdate(file.id, "content", html);

        // Check if we should show block menu based on content
        if (!editor || !editor.view) return;

        try {
          const { from } = editor.state.selection;
          const $from = editor.state.doc.resolve(from);
          const parent = $from.parent;

          // Check if parent exists before accessing textContent
          if (!parent) return;

          const blockText = parent.textContent || "";

          // Show menu if block starts with '/' and we're at the start or after '/'
          if (
            blockText.trim().startsWith("/") &&
            ($from.parentOffset === 0 || $from.parentOffset === 1) &&
            !showBlockMenu
          ) {
            const coords = editor.view.coordsAtPos(from);
            if (coords) {
              setBlockMenuPosition({
                top: coords.top + window.scrollY,
                left: coords.left + window.scrollX,
              });
              setShowBlockMenu(true);
            }
          }
        } catch (error) {
          console.warn("Error checking block menu in onUpdate:", error);
        }
      },
      onSelectionUpdate: ({ editor }) => {
        // Don't close menu on selection update - let it stay open
        // The menu will close when:
        // 1. User selects an option (handleBlockAction)
        // 2. User presses Escape (handleKeyDown)
        // 3. User clicks outside (useEffect with handleClickOutside)
        // 4. Block no longer starts with '/' (checked in onUpdate)
        if (showBlockMenu && editor && editor.view) {
          try {
            const { from } = editor.state.selection;
            const $from = editor.state.doc.resolve(from);
            const parent = $from.parent;

            // Check if parent exists before accessing textContent
            if (!parent) {
              return; // Don't close menu, just return
            }

            const blockText = parent.textContent || "";

            // Only close menu if block no longer starts with '/'
            if (!blockText.trim().startsWith("/")) {
              setShowBlockMenu(false);
            } else {
              // Update menu position if still open and block starts with '/'
              const coords = editor.view.coordsAtPos(from);
              if (coords) {
                setBlockMenuPosition({
                  top: coords.top + (window.scrollY || 0),
                  left: coords.left + (window.scrollX || 0),
                });
              }
            }
          } catch (error) {
            console.warn("Error updating block menu position:", error);
            // Don't close menu on error, just log it
          }
        }
      },
    },
    [file.id] // Remove showBlockMenu from dependencies to prevent editor recreation
  );

  // Focus title input if new
  useEffect(() => {
    if (isNew && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 100);
    }
  }, [isNew]);

  // Focus TipTap editor when note is opened (not new)
  useEffect(() => {
    if (!isNew && editor && !isTitleEditing) {
      const focusTimer = setTimeout(() => {
        editor.commands.focus();
        const end = editor.state.doc.content.size;
        editor.commands.setTextSelection(end);
      }, 150);
      return () => clearTimeout(focusTimer);
    }
  }, [editor, isNew, isTitleEditing]);

  // Update editor content when item ID changes (not on every content change to avoid conflicts)
  useEffect(() => {
    if (editor && file.id) {
      // Convert newlines to HTML before setting content
      const originalContent = file.content || "";
      const htmlContent = convertNewlinesToHTML(originalContent);

      // Debug: log if content contains \n
      if (originalContent.includes("\\n") || originalContent.includes("\n")) {
        console.log("Original content:", JSON.stringify(originalContent));
        console.log("Converted HTML:", htmlContent);
      }

      editor.commands.setContent(htmlContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, editor]);

  // Update title when item changes
  useEffect(() => {
    if (file.title !== title) {
      setTimeout(() => setTitle(file.title), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (title.trim() !== file.title) {
      onUpdate(file.id, "title", title.trim() || "Sem título");
    }
    setIsTitleEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleInputRef.current?.blur();
      setTimeout(() => editor?.commands.focus(), 100);
    }
    if (e.key === "Escape") {
      setTitle(file.title);
      setIsTitleEditing(false);
    }
  };

  const handleTitleClick = () => {
    setIsTitleEditing(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleBlockAction = (action: () => void) => {
    return () => {
      if (!editor) return;

      setShowBlockMenu(false);

      // Remove the '/' character if present at the start of the block
      const { from } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      const parent = $from.parent;

      if (!parent) {
        // Execute action immediately if no parent
        setTimeout(() => {
          action();
          editor?.commands.focus();
        }, 10);
        return;
      }

      const blockText = parent.textContent || "";

      if (blockText.trim().startsWith("/") && $from.parentOffset <= 1) {
        // Delete the '/' character first, then execute action
        // Use a longer delay to ensure deletion completes
        editor
          .chain()
          .focus()
          .setTextSelection({ from: from - 1, to: from })
          .deleteSelection()
          .run();

        // Wait for deletion to complete before executing action
        setTimeout(() => {
          // Ensure editor is still focused and execute action
          if (editor && !editor.isDestroyed) {
            editor.chain().focus().run();
            // Small delay to ensure focus is set
            setTimeout(() => {
              action();
            }, 20);
          }
        }, 50);
      } else {
        // No '/' to remove, just execute action
        setTimeout(() => {
          action();
        }, 10);
      }
    };
  };

  const blockActions = [
    {
      icon: <Hash size={16} />,
      label: "Heading 1",
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: <Hash size={16} />,
      label: "Heading 2",
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: <Hash size={16} />,
      label: "Heading 3",
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: <List size={16} />,
      label: "Bullet List",
      action: () => {
        if (!editor) return;
        editor.chain().focus().toggleBulletList().run();
      },
    },
    {
      icon: <List size={16} />,
      label: "Numbered List",
      action: () => {
        if (!editor) return;
        editor.chain().focus().toggleOrderedList().run();
      },
    },
    {
      icon: <Quote size={16} />,
      label: "Quote",
      action: () => {
        if (!editor) return;
        editor.chain().focus().toggleBlockquote().run();
      },
    },
    {
      icon: <Code2 size={16} />,
      label: "Code Block",
      action: () => {
        if (!editor) return;
        editor.chain().focus().toggleCodeBlock().run();
      },
    },
    {
      icon: <Minus size={16} />,
      label: "Divider",
      action: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <ImageIcon size={16} />,
      label: "Image",
      action: () => {
        // Create file input for image selection
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
              const base64 = readerEvent.target?.result as string;
              if (base64) {
                editor?.chain().focus().setImage({ src: base64 }).run();
              }
            };
            reader.readAsDataURL(file);
          } else {
            // Fallback to URL input if no file selected
            const url = window.prompt("Cole a URL da imagem:");
            if (url && url.trim()) {
              editor?.chain().focus().setImage({ src: url.trim() }).run();
            }
          }
        };
        input.click();
      },
    },
  ];

  // Close block menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        blockMenuRef.current &&
        !blockMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest(".ProseMirror")
      ) {
        // Also check if the block still starts with '/' before closing
        if (editor) {
          try {
            const { from } = editor.state.selection;
            const $from = editor.state.doc.resolve(from);
            const parent = $from.parent;

            if (parent) {
              const blockText = parent.textContent || "";
              // Only close if block doesn't start with '/'
              if (!blockText.trim().startsWith("/")) {
                setShowBlockMenu(false);
              }
            } else {
              setShowBlockMenu(false);
            }
          } catch {
            setShowBlockMenu(false);
          }
        } else {
          setShowBlockMenu(false);
        }
      }
    };

    if (showBlockMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showBlockMenu, editor]);

  // Close font size menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fontSizeMenuRef.current &&
        !fontSizeMenuRef.current.contains(event.target as Node)
      ) {
        setShowFontSizeMenu(false);
      }
    };

    if (showFontSizeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showFontSizeMenu]);

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-foreground/60">Carregando editor...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center gap-4 shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-md hover:bg-hover transition-colors shrink-0"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          {isTitleEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none focus:outline-none"
              placeholder="Sem título..."
              autoFocus
            />
          ) : (
            <h1
              onClick={handleTitleClick}
              className="text-2xl font-semibold cursor-text hover:opacity-80 transition-opacity truncate"
              title="Clique para editar"
            >
              {title || "Sem título..."}
            </h1>
          )}
        </div>
      </div>

      {/* Fixed Toolbar - Text Formatting */}
      {editor && (
        <div
          className="relative z-50 flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg shadow-lg"
          style={{
            backgroundColor: "var(--sidebar-bg)",
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)",
            color: "var(--foreground)",
          }}
        >
          {/* Bold */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                // Ensure editor is focused first
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setTimeout(() => {
                  editor.chain().focus().toggleBold().run();
                }, 0);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("bold") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Negrito (Cmd+B)"
          >
            <Bold size={21} />
          </button>

          {/* Italic */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setTimeout(() => {
                  editor.chain().focus().toggleItalic().run();
                }, 0);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("italic") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Itálico (Cmd+I)"
          >
            <Italic size={21} />
          </button>

          {/* Underline */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setTimeout(() => {
                  editor.chain().focus().toggleUnderline().run();
                }, 0);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("underline") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Sublinhado (Cmd+U)"
          >
            <Underline size={21} />
          </button>

          {/* Strikethrough */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setTimeout(() => {
                  editor.chain().focus().toggleStrike().run();
                }, 0);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("strike") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Tachado (Cmd+Shift+S)"
          >
            <Strikethrough size={21} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Code */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setTimeout(() => {
                  editor.chain().focus().toggleCode().run();
                }, 0);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("code") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Código (Cmd+E)"
          >
            <Code size={18} />
          </button>

          {/* Link */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                const url = window.prompt("Digite a URL:");
                if (url) {
                  setTimeout(() => {
                    editor.chain().focus().setLink({ href: url }).run();
                  }, 0);
                }
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor?.isActive("link") ? "bg-hover" : "hover:bg-hover/50"
            }`}
            title="Link (Cmd+K)"
          >
            <Link size={21} />
          </button>

          {/* Image */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                // Create file input for image selection
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                      const base64 = readerEvent.target?.result as string;
                      if (base64) {
                        setTimeout(() => {
                          editor
                            .chain()
                            .focus()
                            .setImage({ src: base64 })
                            .run();
                        }, 0);
                      }
                    };
                    reader.readAsDataURL(file);
                  } else {
                    // Fallback to URL input if no file selected
                    const url = window.prompt("Cole a URL da imagem:");
                    if (url && url.trim()) {
                      setTimeout(() => {
                        editor
                          .chain()
                          .focus()
                          .setImage({ src: url.trim() })
                          .run();
                      }, 0);
                    }
                  }
                };
                input.click();
              }
            }}
            className="p-1.5 rounded transition-colors hover:bg-hover/50"
            title="Inserir Imagem (arquivo, URL ou base64)"
          >
            <ImageIcon size={21} />
          </button>

          {/* File Link */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editor) {
                if (!editor.isFocused) {
                  editor.commands.focus();
                }
                setShowFileLinkPicker(true);
              }
            }}
            className="p-1.5 rounded transition-colors hover:bg-hover/50"
            title="Linkar Arquivo"
          >
            <FileText size={21} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: "var(--border-color)" }}
          />

          {/* Font Size */}
          <div className="relative" ref={fontSizeMenuRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowFontSizeMenu(!showFontSizeMenu);
              }}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                showFontSizeMenu ? "bg-hover" : "hover:bg-hover/50"
              }`}
              title="Tamanho do Texto"
            >
              <Type size={21} />
              <span className="text-xs">
                {editor.getAttributes("textStyle").fontSize || "18"}px
              </span>
            </button>
            {/* Size dropdown */}
            {showFontSizeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg py-1 min-w-[100px] z-50">
                {["12", "14", "16", "18", "24", "32"].map((size) => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (editor) {
                        if (!editor.isFocused) {
                          editor.commands.focus();
                        }
                        setTimeout(() => {
                          editor.chain().focus().setFontSize(size).run();
                          setShowFontSizeMenu(false);
                        }, 0);
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover/50 transition-colors"
                    style={{ fontSize: `${size}px` }}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Menu */}
      {showBlockMenu && (
        <div
          ref={blockMenuRef}
          className="fixed z-50 bg-background border rounded-lg shadow-lg py-1 min-w-[200px]"
          style={{
            top: `${blockMenuPosition.top}px`,
            left: `${blockMenuPosition.left}px`,
            borderColor: "var(--border-color)",
            backgroundColor: "var(--background)",
          }}
        >
          {blockActions.map((block, index) => (
            <button
              key={index}
              onClick={handleBlockAction(block.action)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-hover/50 transition-colors"
            >
              {block.icon}
              {block.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div
            className="min-h-[400px] focus-within:outline-none"
            onClick={() => {
              if (!editor.isFocused) {
                editor.commands.focus();
              }
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* File Link Picker */}
      {showFileLinkPicker && file.workspace_id && (
        <FileLinkPicker
          workspaceId={file.workspace_id}
          currentFileId={file.id}
          onSelect={(selectedFile: File) => {
            if (editor) {
              // Create internal link URL
              const linkUrl = `/${file.workspace_id}/${selectedFile.id}`;

              // Get current selection or use file title as default text
              const { from, to } = editor.state.selection;
              const selectedText = editor.state.doc.textBetween(from, to);
              const linkText = selectedText || selectedFile.title;

              // Insert or replace with link
              editor
                .chain()
                .focus()
                .insertContent(
                  `<a href="${linkUrl}" data-file-id="${selectedFile.id}" class="file-link">${linkText}</a>`
                )
                .run();
            }
            setShowFileLinkPicker(false);
          }}
          onClose={() => setShowFileLinkPicker(false)}
        />
      )}
    </div>
  );
}
