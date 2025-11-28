"use client";

import { useState } from "react";
import { X, FolderOpen, Video, CheckSquare, StickyNote } from "lucide-react";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    type: "section" | "video" | "task" | "note";
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
  parentId?: string;
}

export default function AddItemModal({
  isOpen,
  onClose,
  onAdd,
  parentId,
}: AddItemModalProps) {
  const [selectedType, setSelectedType] = useState<
    "section" | "video" | "task" | "note"
  >("section");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  if (!isOpen) return null;

  const itemTypes = [
    {
      type: "section" as const,
      label: "Seção",
      icon: <FolderOpen size={20} />,
      description: "Organize conteúdo em seções",
    },
    {
      type: "video" as const,
      label: "Vídeo",
      icon: <Video size={20} />,
      description: "Adicione um vídeo do YouTube",
    },
    {
      type: "task" as const,
      label: "Tarefa",
      icon: <CheckSquare size={20} />,
      description: "Crie uma tarefa para completar",
    },
    {
      type: "note" as const,
      label: "Nota",
      icon: <StickyNote size={20} />,
      description: "Adicione uma nota ou observação",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    setSelectedType("section");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-2xl w-full max-w-lg mx-4"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--border-color)",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottomWidth: "1px",
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border-color)",
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Adicionar Novo Item
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{
              color: "var(--foreground)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Type Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: "var(--foreground)" }}
            >
              Tipo de Item
            </label>
            <div className="grid grid-cols-2 gap-3">
              {itemTypes.map((itemType) => (
                <button
                  key={itemType.type}
                  type="button"
                  onClick={() => setSelectedType(itemType.type)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-lg transition-all"
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor:
                      selectedType === itemType.type
                        ? "#3b82f6"
                        : "var(--border-color)",
                    backgroundColor:
                      selectedType === itemType.type
                        ? "rgba(59, 130, 246, 0.1)"
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== itemType.type) {
                      e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== itemType.type) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      color:
                        selectedType === itemType.type
                          ? "#3b82f6"
                          : "var(--foreground)",
                      opacity: 0.8,
                    }}
                  >
                    {itemType.icon}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        selectedType === itemType.type
                          ? "#3b82f6"
                          : "var(--foreground)",
                    }}
                  >
                    {itemType.label}
                  </span>
                  <span
                    className="text-xs text-center leading-tight"
                    style={{
                      color: "var(--foreground)",
                      opacity: 0.6,
                    }}
                  >
                    {itemType.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Título <span style={{ opacity: 0.6 }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título..."
              className="w-full px-3 py-2.5 rounded-md focus:outline-none transition-all"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--border-color)",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "var(--foreground)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
              }}
              autoFocus
              required
            />
          </div>

          {/* YouTube URL (only for video type) */}
          {selectedType === "video" && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                URL do YouTube
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2.5 rounded-md focus:outline-none transition-all"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border-color)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          )}

          {/* Content (for task and note) */}
          {(selectedType === "task" || selectedType === "note") && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Descrição
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite a descrição..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-md focus:outline-none resize-none transition-all"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border-color)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div
            className="flex gap-3 pt-3"
            style={{
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: "var(--border-color)",
              paddingTop: "1rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors"
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--border-color)",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-md font-medium text-white transition-colors"
              style={{
                backgroundColor: "#3b82f6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
              }}
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
