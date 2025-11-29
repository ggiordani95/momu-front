"use client";

import { useState } from "react";
import { Folder, File as FileIcon, ChevronRight, ChevronDown, Check } from "lucide-react";
import { HierarchicalItem } from "@/lib/types";
import { useItems } from "@/lib/contexts/ItemsContext";

interface ItemPickerProps {
  onSelect: (item: HierarchicalItem) => void;
  onCancel: () => void;
  excludeId?: string;
}

export function ItemPicker({ onSelect, onCancel, excludeId }: ItemPickerProps) {
  const itemsContext = useItems();
  const items = itemsContext?.items || [];
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: HierarchicalItem, depth: number = 0) => {
    if (item.id === excludeId) return null;
    
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.id}>
        <div 
          className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer rounded-md transition-colors"
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => onSelect(item)}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => toggleFolder(item.id, e)}
              className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          
          {item.type === "section" ? (
            <Folder size={16} className="text-blue-400 shrink-0" />
          ) : (
            <FileIcon size={16} className="text-white/60 shrink-0" />
          )}
          
          <span className="text-sm text-white/80 truncate">{item.title}</span>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {item.children!.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#1C1C1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-medium text-white">Selecionar Item</h3>
          <button onClick={onCancel} className="text-white/40 hover:text-white">
            <span className="sr-only">Fechar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {items.map(item => renderItem(item))}
          {items.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">
              Nenhum item encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
