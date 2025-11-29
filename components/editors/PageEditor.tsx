"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import EditableText from "./EditableText";
import Checklist from "./Checklist";
import type { HierarchicalItem } from "@/lib/types";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface PageEditorProps {
  item: HierarchicalItem;
  onBack: () => void;
  onUpdate: (id: string, field: "title" | "content", value: string) => void;
  isNew?: boolean;
}

export default function PageEditor({
  item,
  onUpdate,
  onBack,
  isNew = false,
}: PageEditorProps) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");
  const [editorKey, setEditorKey] = useState(0);

  // Reset editor key when item changes to force complete remount
  useEffect(() => {
    setEditorKey((prev) => prev + 1);
  }, [item.id]);

  // Parse checklist from content if it's a task
  const parsedChecklistItems = useMemo((): ChecklistItem[] => {
    if (item.type !== "task") return [];
    if (item.content?.trim()) {
      try {
        const parsed = JSON.parse(item.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((todo, index) => ({
            ...todo,
            id: todo.id || `checklist-item-${index}`,
            text: todo.text || String(todo),
            completed: Boolean(todo.completed),
          }));
        }
      } catch {
        // ignore parsing errors
      }
    }

    if (item.children && item.children.length > 0) {
      return item.children.map((child, index) => ({
        id: child.id || `child-checklist-${index}`,
        text: child.title || "Item",
        completed: false,
      }));
    }

    if (item.content?.trim()) {
      return [
        {
          id: `checklist-item-${item.id}`,
          text: item.content,
          completed: false,
        },
      ];
    }

    return [];
  }, [item.content, item.id, item.type, item.children]);

  const [checklistItems, setChecklistItems] =
    useState<ChecklistItem[]>(parsedChecklistItems);

  // Sync checklist items when parsed items change
  useEffect(() => {
    setChecklistItems(parsedChecklistItems);
  }, [parsedChecklistItems]);

  const handleTitleSave = (newTitle: string) => {
    setTitle(newTitle);
    onUpdate(item.id, "title", newTitle);
  };

  const handleContentSave = (newContent: string) => {
    setContent(newContent);
    onUpdate(item.id, "content", newContent);
  };

  const handleChecklistUpdate = (items: ChecklistItem[]) => {
    setChecklistItems(items);
    // Save checklist as JSON string
    const content = JSON.stringify(items);
    onUpdate(item.id, "content", content);
  };

  const isTask = item.type === "task";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="p-4 border-b flex items-center gap-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-md hover:bg-hover transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <EditableText
            value={title}
            onSave={handleTitleSave}
            className="text-2xl font-semibold"
            placeholder="Sem título..."
            startEditing={isNew}
          />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {isTask ? (
            <Checklist
              items={checklistItems}
              onUpdate={handleChecklistUpdate}
            />
          ) : (
            <RichTextEditor
              key={`${item.id}-${editorKey}`}
              content={content}
              onSave={handleContentSave}
              placeholder="Comece a escrever..."
              autoFocus={item.type === "note"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
