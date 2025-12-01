"use client";

import React, { useState, useRef } from "react";
import { CheckCircle2, Clock, Circle, Search } from "lucide-react";
import { HierarchicalFile } from "@/lib/types";
import { ItemPicker } from "@/components/ItemPicker";
import { useRouter } from "next/navigation";
import { TaskDetailView } from "./TaskDetailView";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { buildHierarchy } from "@/lib/utils/hierarchy";
import { useMemo } from "react";

interface PlannerCard {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  linkedItemId?: string;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  notifications?: boolean;
}

export function PlannerWorkspace({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  // Get files from Zustand store
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = getFilesByWorkspace(workspaceId);
  const items = useMemo(() => buildHierarchy(workspaceFiles), [workspaceFiles]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const nextIdRef = useRef(1000);

  const [cards, setCards] = useState<PlannerCard[]>([
    {
      id: "1",
      title: "Planejar Q1 2025",
      description: "Definir metas e objetivos para o próximo trimestre.",
      status: "todo",
      priority: "high",
      dueDate: new Date(2025, 0, 15),
      tags: ["planejamento", "estratégia"],
      notifications: true,
    },
    {
      id: "2",
      title: "Revisar contratos",
      description: "Análise completa dos contratos de fornecedores",
      status: "in_progress",
      priority: "medium",
      dueDate: new Date(2025, 0, 10),
      tags: ["legal", "urgente"],
      notifications: true,
    },
    {
      id: "3",
      title: "Reunião com cliente ABC",
      description: "Apresentar proposta de projeto e discutir orçamento",
      status: "todo",
      priority: "high",
      dueDate: new Date(2025, 0, 5),
      tags: ["reunião", "vendas"],
      notifications: true,
    },
    {
      id: "4",
      title: "Atualizar documentação",
      description: "Documentação técnica do sistema atualizada",
      status: "done",
      priority: "low",
      tags: ["documentação"],
      notifications: false,
    },
    {
      id: "5",
      title: "Criar apresentação de vendas",
      description: "Slides para pitch de novos clientes",
      status: "todo",
      priority: "medium",
      dueDate: new Date(2025, 0, 12),
      tags: ["vendas", "marketing"],
      notifications: true,
    },
    {
      id: "6",
      title: "Desenvolver novo módulo",
      description: "Implementação do sistema de relatórios avançados",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(2025, 0, 8),
      tags: ["desenvolvimento", "urgente"],
      notifications: true,
    },
  ]);

  const [showItemPicker, setShowItemPicker] = useState<string | null>(null);

  const columns = [
    {
      id: "todo",
      title: "A Fazer",
      icon: Circle,
      color: "blue",
    },
    {
      id: "in_progress",
      title: "Em Progresso",
      icon: Clock,
      color: "yellow",
    },
    {
      id: "done",
      title: "Concluído",
      icon: CheckCircle2,
      color: "green",
    },
  ];

  const handleAddCard = (status: "todo" | "in_progress" | "done") => {
    const newCard: PlannerCard = {
      id: String(nextIdRef.current++),
      title: "Nova Tarefa",
      status,
      priority: "medium",
      notifications: false,
      dueDate: undefined,
    };
    setCards([...cards, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
  };

  const handleLinkItem = (cardId: string, item: HierarchicalFile) => {
    setCards(
      cards.map((c) => (c.id === cardId ? { ...c, linkedItemId: item.id } : c))
    );
    setShowItemPicker(null);
  };

  const handleUpdateCard = (updatedCard: PlannerCard) => {
    setCards(cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleCardClick = (cardId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    setSelectedCardId(cardId);
  };

  const handleDragStart = (cardId: string) => {
    setDraggedCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: "todo" | "in_progress" | "done") => {
    if (draggedCard) {
      setCards(cards.map((c) => (c.id === draggedCard ? { ...c, status } : c)));
      setDraggedCard(null);
    }
  };

  const findItem = (
    items: HierarchicalFile[],
    id: string
  ): HierarchicalFile | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const navigateToItem = (itemId: string) => {
    // Navigate to explorer view (workspace managed by Zustand)
    router.push(`/explorer/${itemId}`);
  };

  const filteredCards = cards.filter((card) => {
    if (
      searchQuery &&
      !card.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getStatusCount = (status: string) => {
    return filteredCards.filter((c) => c.status === status).length;
  };

  // Se uma card está selecionada, mostrar a tela de detalhes
  const selectedCard = selectedCardId
    ? cards.find((c) => c.id === selectedCardId)
    : null;
  const selectedLinkedItem = selectedCard?.linkedItemId
    ? findItem(items, selectedCard.linkedItemId)
    : null;

  if (selectedCard) {
    return (
      <TaskDetailView
        card={selectedCard}
        linkedItem={selectedLinkedItem}
        onBack={() => setSelectedCardId(null)}
        onUpdate={handleUpdateCard}
        onDelete={handleDeleteCard}
        onLinkItem={(item) => {
          if (selectedCardId) {
            handleLinkItem(selectedCardId, item);
          }
        }}
        onNavigateToItem={navigateToItem}
        workspaceId={workspaceId}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header simples */}
      <div
        className="px-6 pt-6 pb-4 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Tarefas
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--foreground)", opacity: 0.5 }}
            >
              Gerencie suas atividades
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--foreground)", opacity: 0.3 }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-all w-48"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* List View - Vertical simples */}
        <div className="space-y-6 max-w-4xl">
          {columns.map((col) => {
            const Icon = col.icon;
            const statusCards = filteredCards.filter(
              (c) => c.status === col.id
            );

            return (
              <div key={col.id} className="space-y-2">
                {/* Header da seção */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      col.color === "blue"
                        ? "bg-blue-400/60"
                        : col.color === "yellow"
                        ? "bg-yellow-400/60"
                        : "bg-green-400/60"
                    }`}
                  />
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {col.title}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--hover-bg)",
                      color: "var(--foreground)",
                      opacity: 0.4,
                    }}
                  >
                    {getStatusCount(col.id)}
                  </span>
                  <button
                    onClick={() =>
                      handleAddCard(col.id as "todo" | "in_progress" | "done")
                    }
                    className="ml-auto text-xs transition-colors"
                    style={{ color: "var(--foreground)", opacity: 0.5 }}
                  >
                    + Nova tarefa
                  </button>
                </div>

                {/* Cards da seção */}
                <div className="space-y-1">
                  {statusCards.map((card) => (
                    <div
                      key={card.id}
                      id={`card-${card.id}`}
                      draggable
                      onDragStart={() => handleDragStart(card.id)}
                      onDragOver={handleDragOver}
                      onDrop={() =>
                        handleDrop(col.id as "todo" | "in_progress" | "done")
                      }
                      onClick={(e) => handleCardClick(card.id, e)}
                      className="group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all animate-item-entry"
                      style={{
                        backgroundColor: "var(--hover-bg)",
                        opacity: draggedCard === card.id ? 0.5 : 1,
                      }}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <Icon
                          size={16}
                          className={`${
                            col.color === "blue"
                              ? "text-blue-400/70"
                              : col.color === "yellow"
                              ? "text-yellow-400/70"
                              : "text-green-400/70"
                          }`}
                        />
                      </div>
                      <span
                        className="flex-1 font-medium text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {card.title}
                      </span>
                    </div>
                  ))}

                  {statusCards.length === 0 && (
                    <div
                      className="text-center py-4 text-sm"
                      style={{ color: "var(--foreground)", opacity: 0.3 }}
                    >
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showItemPicker && (
        <ItemPicker
          workspaceId={workspaceId}
          onSelect={(item) => {
            if (showItemPicker) {
              handleLinkItem(showItemPicker, item);
            }
          }}
          onCancel={() => setShowItemPicker(null)}
        />
      )}
    </div>
  );
}
