"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FILE_TYPES, type FileType } from "@/modules/files/types/filesTypes";

interface AddItemModalProps {
  onAdd: (item: {
    type: FileType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
  onCancel: () => void;
  parentId?: string;
  allowSections?: boolean;
}

export default function AddItemModal({
  onAdd,
  onCancel,
  parentId,
}: AddItemModalProps) {
  const [selectedType, setSelectedType] = useState<FileType | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger mount animation
    setTimeout(() => setIsMounted(true), 10);
  }, []);

  const handleCancel = useCallback(() => {
    setIsMounted(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  useEffect(() => {
    if (selectedType === "video" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [selectedType]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCancel]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedType) return;

    // For video, require title
    if (selectedType === "video" && !title.trim()) return;

    onAdd({
      type: selectedType,
      title: title.trim() || "Novo item",
      content: undefined,
      youtube_url: youtubeUrl.trim() || undefined,
      parent_id: parentId,
    });

    // Reset form
    setTitle("");
    setYoutubeUrl("");
    setSelectedType(null);
    handleCancel();
  };

  const handleTypeClick = (type: FileType) => {
    // If clicking on video, select it and show form
    if (type === "video") {
      setSelectedType(type);
      return;
    }

    // For other types, create immediately
    onAdd({
      type,
      title: "Novo item",
      content: undefined,
      youtube_url: undefined,
      parent_id: parentId,
    });
    handleCancel();
  };

  const availableTypes = FILE_TYPES.filter((fileType) => {
    const allowedTypes: FileType[] = ["folder", "note", "video"];
    return allowedTypes.includes(fileType.type);
  });

  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(30px) saturate(200%)",
        WebkitBackdropFilter: "blur(30px) saturate(200%)",
        opacity: isMounted ? 1 : 0,
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Close Button - macOS style dark */}
      <button
        onClick={handleCancel}
        className="absolute top-8 right-8 p-2 rounded-full transition-all hover:bg-white/5 backdrop-blur-xl z-10"
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}
        aria-label="Fechar"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <X size={18} />
      </button>

      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center"
        style={{
          transform: isMounted ? "scale(1)" : "scale(0.9)",
          opacity: isMounted ? 1 : 0,
          transition: "all 0.3s ease-out",
        }}
      >
        {/* Icon Grid - macOS Dock style */}
        {!selectedType && (
          <div className="flex items-center justify-center gap-8">
            {availableTypes.map((fileType, index) => {
              const IconComponent = fileType.icon;
              return (
                <button
                  key={fileType.type}
                  type="button"
                  onClick={() => handleTypeClick(fileType.type)}
                  className="flex flex-col items-center justify-center transition-all duration-300 group"
                  style={{
                    opacity: isMounted ? 1 : 0,

                    backgroundColor: "transparent",
                  }}
                >
                  <div
                    className="mb-3 p-8 rounded-3xl transition-all duration-300 relative"
                    style={{
                      color:
                        fileType.type === "folder"
                          ? "#a78bfa"
                          : fileType.type === "note"
                          ? "#60a5fa"
                          : "#f87171",
                    }}
                  >
                    <IconComponent size={96} />
                  </div>
                  <span
                    className="text-xl font-semibold transition-colors"
                    style={{
                      color: "rgba(255, 255, 255, 0.95)",
                      textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {fileType.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Video Form - Floating */}
        {selectedType === "video" && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 w-full max-w-md"
            style={{
              opacity: isMounted ? 1 : 0,
              transform: isMounted ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.4s ease-out",
            }}
          >
            <div
              className="p-10 rounded-3xl"
              style={{
                backgroundColor: "transparent",
              }}
            >
              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  Título do Vídeo
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título..."
                  className="w-full px-5 py-4 rounded-2xl text-base focus:outline-none transition-all"
                  style={{
                    backgroundColor: "transparent",
                    color: "rgba(255, 255, 255, 0.95)",
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
                    e.currentTarget.style.borderColor =
                      "rgba(96, 165, 250, 0.5)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 4px rgba(96, 165, 250, 0.15)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  required
                />
              </div>

              <div className="mt-4">
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  URL do YouTube (opcional)
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-5 py-4 rounded-2xl text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: "transparent",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.95)",
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
                    e.currentTarget.style.borderColor =
                      "rgba(96, 165, 250, 0.5)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 4px rgba(96, 165, 250, 0.15)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={handleCancel}
                className="px-8 py-3 rounded-xl text-sm font-medium transition-all backdrop-blur-xl"
                style={{
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-8 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl"
                style={{
                  color: "white",
                  backgroundColor: title.trim()
                    ? "#007AFF"
                    : "rgba(107, 114, 128, 0.4)",
                  border: title.trim()
                    ? "1px solid rgba(0, 122, 255, 0.3)"
                    : "1px solid rgba(107, 114, 128, 0.2)",
                  boxShadow: title.trim()
                    ? "0 2px 8px rgba(0, 122, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (title.trim()) {
                    e.currentTarget.style.backgroundColor = "#0051D5";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 122, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (title.trim()) {
                    e.currentTarget.style.backgroundColor = "#007AFF";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0, 122, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                Adicionar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
