"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import EditableText from "./EditableText";
import Checklist from "./Checklist";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TopicItem {
  id: string;
  type: string;
  title: string;
  content?: string;
  youtube_id?: string;
  youtube_url?: string;
  parent_id?: string;
  children?: TopicItem[];
  order_index?: number;
}

interface PageEditorProps {
  item: TopicItem;
  onBack: () => void;
  onUpdate: (id: string, field: "title" | "content", value: string) => void;
}

export default function PageEditor({
  item,
  onUpdate,
  onBack,
}: PageEditorProps) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");

  // Parse checklist from content if it's a task
  const parsedChecklistItems = useMemo((): ChecklistItem[] => {
    if (item.type !== "task") return [];
    if (!item.content) return [];

    try {
      const parsed = JSON.parse(item.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // If parsing fails, treat as plain text
    }

    // Legacy: if content is not JSON, create a single item
    if (item.content.trim()) {
      return [{ id: "1", text: item.content, completed: false }];
    }

    return [];
  }, [item.content, item.type]);

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
              content={content}
              onSave={handleContentSave}
              placeholder="Comece a escrever..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
