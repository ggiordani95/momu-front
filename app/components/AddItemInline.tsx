"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { ITEM_TYPES, type ItemType } from "@/lib/itemTypes";

interface AddItemInlineProps {
  onAdd: (item: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
  onCancel: () => void;
  parentId?: string;
  allowSections?: boolean;
}

export default function AddItemInline({
  onAdd,
  onCancel,
  parentId,
  allowSections = false,
}: AddItemInlineProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(
    allowSections ? "section" : "video"
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-expand after mount for animation
    const timer = setTimeout(() => setIsExpanded(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      type: selectedType,
      title: title.trim(),
      content: content.trim() || undefined,
      youtube_url: youtubeUrl.trim() || undefined,
      parent_id: parentId,
    });

    // Reset form
    setTitle("");
    setContent("");
    setYoutubeUrl("");
    setSelectedType(allowSections ? "section" : "video");
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  };

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out rounded-3xl"
      style={{
        maxHeight: isExpanded ? "1000px" : "0px",
        opacity: isExpanded ? 1 : 0,
        transform: isExpanded ? "translateY(0)" : "translateY(-10px)",
      }}
    >
      <div
        className="p-3 relative overflow-hidden"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.03)",
          backdropFilter: "blur(8px) saturate(120%)",
          WebkitBackdropFilter: "blur(8px) saturate(120%)",
          isolation: "isolate",
          transition: "all 0.3s ease-out",
        }}
      >
        {/* Glass overlay effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(12, 12, 12, 0.6) 0%, rgba(11, 10, 10, 0.863) 100%)",
            borderRadius: "inherit",
          }}
        />
        <form onSubmit={handleSubmit} className="p-4 space-y-4 relative z-10">
          {/* Header with type selection and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ITEM_TYPES.filter((itemType) => {
                // Always show: section, note, task, video
                const allowedTypes: ItemType[] = [
                  "section",
                  "note",
                  "task",
                  "video",
                ];
                return allowedTypes.includes(itemType.type);
              }).map((itemType, index) => (
                <button
                  key={itemType.type}
                  type="button"
                  onClick={() => setSelectedType(itemType.type)}
                  className="relative p-2.5 rounded-lg transition-all duration-200 group"
                  style={{
                    backgroundColor:
                      selectedType === itemType.type
                        ? "rgba(59, 130, 246, 0.12)"
                        : "transparent",
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded
                      ? "translateY(0) scale(1)"
                      : "translateY(5px) scale(0.95)",
                    transition: `all 0.3s ease-out ${0.05 + index * 0.05}s`,
                  }}
                  title={itemType.label}
                  onMouseEnter={(e) => {
                    if (selectedType !== itemType.type) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(59, 130, 246, 0.06)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== itemType.type) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div
                    className="block transition-transform duration-200"
                    style={{
                      transform:
                        selectedType === itemType.type
                          ? "scale(1.1)"
                          : "scale(1)",
                      filter:
                        selectedType === itemType.type
                          ? "drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))"
                          : "none",
                    }}
                  >
                    {(() => {
                      const IconComponent = itemType.icon;
                      return <IconComponent size={20} />;
                    })()}
                  </div>
                  {selectedType === itemType.type && (
                    <div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: "#3b82f6",
                        boxShadow: "0 0 4px rgba(59, 130, 246, 0.6)",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSubmit}
                className="p-2 rounded-lg transition-all duration-200"
                style={{
                  color: "#3b82f6",
                  backgroundColor: title.trim()
                    ? "rgba(59, 130, 246, 0.1)"
                    : "transparent",
                  opacity: title.trim() ? 1 : 0.4,
                  cursor: title.trim() ? "pointer" : "not-allowed",
                }}
                disabled={!title.trim()}
                title="Adicionar (Enter)"
                onMouseEnter={(e) => {
                  if (title.trim()) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(59, 130, 246, 0.15)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (title.trim()) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(59, 130, 246, 0.1)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <Check size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-2 rounded-lg transition-all duration-200"
                style={{
                  color: "var(--foreground)",
                  opacity: 0.6,
                }}
                title="Cancelar (Esc)"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.opacity = "0.6";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div
            style={{
              opacity: isExpanded ? 1 : 0,
              transform: isExpanded ? "translateY(0)" : "translateY(5px)",
              transition: "all 0.3s ease-out 0.2s",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título..."
              className="w-full px-4 py-3 rounded-lg text-base focus:outline-none transition-all duration-200"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.01)",
                backdropFilter: "blur(6px) saturate(110%)",
                WebkitBackdropFilter: "blur(6px) saturate(110%)",
                borderColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "var(--foreground)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                } else if (e.key === "Escape") {
                  handleCancel();
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(59, 130, 246, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.backgroundColor =
                  "rgba(59, 130, 246, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.01)";
              }}
              required
            />
          </div>

          {/* YouTube URL (only for video type) */}
          {selectedType === "video" && (
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: selectedType === "video" ? "100px" : "0px",
                opacity: selectedType === "video" ? 1 : 0,
                transform:
                  selectedType === "video"
                    ? "translateY(0)"
                    : "translateY(-5px)",
              }}
            >
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="URL do YouTube..."
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.01)",
                  backdropFilter: "blur(6px) saturate(110%)",
                  WebkitBackdropFilter: "blur(6px) saturate(110%)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "var(--foreground)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === "Escape") {
                    handleCancel();
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(59, 130, 246, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.backgroundColor =
                    "rgba(59, 130, 246, 0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.01)";
                }}
              />
            </div>
          )}

          {/* Content (for task and note) */}
          {(selectedType === "task" || selectedType === "note") && (
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight:
                  selectedType === "task" || selectedType === "note"
                    ? "120px"
                    : "0px",
                opacity:
                  selectedType === "task" || selectedType === "note" ? 1 : 0,
                transform:
                  selectedType === "task" || selectedType === "note"
                    ? "translateY(0)"
                    : "translateY(-5px)",
              }}
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Descrição..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none resize-none transition-all duration-200"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(12px) saturate(150%)",
                  WebkitBackdropFilter: "blur(12px) saturate(150%)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "var(--foreground)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === "Escape") {
                    handleCancel();
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(59, 130, 246, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.backgroundColor =
                    "rgba(59, 130, 246, 0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.03)";
                }}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
