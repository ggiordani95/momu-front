"use client";

import { useState, useEffect, useRef } from "react";
import { Search, File as FileIcon, Folder, CornerDownLeft, Link as LinkIcon, X } from "lucide-react";
import { HierarchicalItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useItems } from "@/lib/contexts/ItemsContext";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function GlobalSearch({ isOpen, onClose, workspaceId }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const itemsContext = useItems();
  const items = itemsContext?.items || [];
  
  const getAllItems = (items: HierarchicalItem[]): HierarchicalItem[] => {
    let result: HierarchicalItem[] = [];
    for (const item of items) {
      result.push(item);
      if (item.children) {
        result = [...result, ...getAllItems(item.children)];
      }
    }
    return result;
  };

  const allItems = getAllItems(items);
  
  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) && 
    !item.id.startsWith("temp-")
  ).slice(0, 8);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSelect = (item: HierarchicalItem) => {
    const path = buildPath(items, item.id);
    if (path) {
      router.push(`/${workspaceId}/${path.join("/")}`);
    } else {
      router.push(`/${workspaceId}/${item.id}`);
    }
    onClose();
  };

  const buildPath = (items: HierarchicalItem[], targetId: string, currentPath: string[] = []): string[] | null => {
    for (const item of items) {
      if (item.id === targetId) {
        return [...currentPath, item.id];
      }
      if (item.children) {
        const found = buildPath(item.children, targetId, [...currentPath, item.id]);
        if (found) return found;
      }
    }
    return null;
  };

  const copyLink = (e: React.MouseEvent, item: HierarchicalItem) => {
    e.stopPropagation();
    const path = buildPath(items, item.id);
    const url = `${window.location.origin}/${workspaceId}/${path ? path.join("/") : item.id}`;
    navigator.clipboard.writeText(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-200" 
        onClick={onClose}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      />
      
      {/* Search Container - Spotlight Style */}
      <div 
        className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200"
        style={{
          animation: 'spotlight-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div 
          className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{
            background: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset',
          }}
        >
          {/* Search Input */}
          <div className="flex items-center px-5 py-4 border-b border-white/[0.06]">
            <Search size={20} className="text-white/50 mr-3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pesquisar..."
              className="flex-1 bg-transparent border-none outline-none text-white text-[15px] placeholder:text-white/40 font-normal"
              style={{ caretColor: '#0A84FF' }}
            />
            <button 
              onClick={onClose} 
              className="ml-3 text-white/40 hover:text-white/60 transition-colors p-1 rounded-md hover:bg-white/5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {query && filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-white/30 text-sm">Nenhum resultado encontrado</div>
              </div>
            ) : query ? (
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer group transition-all duration-150 ${
                      index === selectedIndex 
                        ? "bg-white/[0.08]" 
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        index === selectedIndex ? "bg-white/[0.08]" : "bg-white/[0.04]"
                      }`}>
                        {item.type === "section" ? (
                          <Folder size={18} className="text-blue-400" />
                        ) : (
                          <FileIcon size={18} className="text-white/70" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="text-[13px] font-medium text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-white/40 truncate">
                          {item.type === "section" ? "Pasta" : item.type === "note" ? "Nota" : "Tarefa"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={(e) => copyLink(e, item)}
                        className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Copiar Link"
                      >
                        <LinkIcon size={13} />
                      </button>
                      {index === selectedIndex && (
                        <div className="flex items-center gap-1 text-white/30 text-[11px] font-medium">
                          <CornerDownLeft size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Search size={32} className="text-white/20 mx-auto mb-3" />
                <div className="text-white/40 text-sm">Digite para pesquisar</div>
                <div className="text-white/20 text-xs mt-1">Arquivos, pastas e muito mais</div>
              </div>
            )}
          </div>

          {/* Footer */}
          {query && filteredItems.length > 0 && (
            <div 
              className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            >
              <div className="flex gap-4 text-[11px] text-white/30">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">↑↓</kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">↵</kbd>
                  Abrir
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono text-[10px]">ESC</kbd>
                  Fechar
                </span>
              </div>
              <div className="text-[11px] text-white/30">
                {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spotlight-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
