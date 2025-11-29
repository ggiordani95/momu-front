"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  onUpdate: (items: ChecklistItem[]) => void;
}

export default function Checklist({
  items: initialItems,
  onUpdate,
}: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      text: newItemText.trim(),
      completed: false,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    onUpdate(updatedItems);
    setNewItemText("");
  };

  const handleToggleItem = (id: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);
    onUpdate(updatedItems);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    onUpdate(updatedItems);
  };

  const handleUpdateItemText = (id: string, text: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, text } : item
    );
    setItems(updatedItems);
    onUpdate(updatedItems);
  };

  return (
    <div className="space-y-3">
      {/* Checklist Items */}
      {items.map((item, index) => (
        <div
          key={item.id || `checklist-${index}-${item.text}`}
          className="flex items-center gap-3 p-3 rounded-lg transition-colors group hover:bg-hover/30"
        >
          <button
            onClick={() => handleToggleItem(item.id)}
            className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              item.completed
                ? "bg-blue-600 border-blue-600"
                : "border-foreground/30 hover:border-blue-500"
            }`}
          >
            {item.completed && <Check size={14} className="text-white" />}
          </button>
          <input
            type="text"
            value={item.text}
            onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
            onBlur={() => onUpdate(items)}
            className={`flex-1 bg-transparent border-none outline-none text-base ${
              item.completed
                ? "line-through text-foreground/50"
                : "text-foreground"
            }`}
            placeholder="Item da lista..."
          />
          <button
            onClick={() => handleDeleteItem(item.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-hover text-foreground/50 hover:text-foreground"
            title="Remover item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {/* Add New Item */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-foreground/20 hover:border-foreground/40 transition-colors">
        <div className="shrink-0 w-6 h-6 rounded border-2 border-foreground/30 flex items-center justify-center">
          <Plus size={14} className="text-foreground/40" />
        </div>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddItem();
            }
          }}
          placeholder="Adicionar novo item..."
          className="flex-1 bg-transparent border-none outline-none text-base text-foreground/60 placeholder:text-foreground/40"
        />
        {newItemText.trim() && (
          <button
            onClick={handleAddItem}
            className="p-1 rounded hover:bg-hover text-foreground/60 hover:text-foreground transition-colors"
            title="Adicionar (Enter)"
          >
            <Check size={16} />
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-8 text-foreground/40">
          <p>Nenhum item na lista. Adicione um item acima.</p>
        </div>
      )}
    </div>
  );
}
