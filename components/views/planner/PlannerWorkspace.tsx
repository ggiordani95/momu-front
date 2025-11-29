"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Circle,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Folder,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bell,
  BellOff,
  GripVertical,
  Search,
  LayoutGrid,
  Rows,
} from "lucide-react";
import { HierarchicalItem } from "@/lib/types";
import { ItemPicker } from "@/components/ItemPicker";
import { useRouter } from "next/navigation";
import { useItems } from "@/lib/contexts/ItemsContext";

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
  const itemsContext = useItems();
  const items = itemsContext?.items || [];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [calendarView, setCalendarView] = useState<"week" | "month">("month");
  const nextIdRef = useRef(1000);

  const [cards, setCards] = useState<PlannerCard[]>([
    // TODO Column
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
      id: "7",
      title: "Revisar proposta técnica",
      description: "Análise de viabilidade do projeto X",
      status: "todo",
      priority: "low",
      dueDate: new Date(2025, 0, 20),
      tags: ["técnico", "análise"],
      notifications: false,
    },
    {
      id: "9",
      title: "Agendar treinamento da equipe",
      description: "Organizar workshop sobre novas ferramentas",
      status: "todo",
      priority: "medium",
      dueDate: new Date(2025, 0, 18),
      tags: ["rh", "treinamento"],
      notifications: true,
    },

    // IN PROGRESS Column
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
      id: "6",
      title: "Desenvolver novo módulo",
      description: "Implementação do sistema de relatórios avançados",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(2025, 0, 8),
      tags: ["desenvolvimento", "urgente"],
      notifications: true,
    },
    {
      id: "8",
      title: "Atualizar banco de dados",
      description: "Migração para nova versão e otimização de queries",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(2025, 0, 7),
      tags: ["infraestrutura", "técnico"],
      notifications: true,
    },
    {
      id: "10",
      title: "Design do novo dashboard",
      description: "Criar protótipos e wireframes no Figma",
      status: "in_progress",
      priority: "medium",
      dueDate: new Date(2025, 0, 14),
      tags: ["design", "ux"],
      notifications: false,
    },
    {
      id: "12",
      title: "Pesquisa de mercado",
      description: "Análise de concorrentes e tendências do setor",
      status: "in_progress",
      priority: "low",
      dueDate: new Date(2025, 0, 22),
      tags: ["pesquisa", "estratégia"],
      notifications: false,
    },

    // DONE Column
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
      id: "11",
      title: "Configurar ambiente de produção",
      description: "Deploy e configuração dos servidores",
      status: "done",
      priority: "high",
      dueDate: new Date(2024, 11, 28),
      tags: ["infraestrutura", "devops"],
      notifications: false,
    },
    {
      id: "13",
      title: "Reunião de kickoff do projeto",
      description: "Alinhamento inicial com toda a equipe",
      status: "done",
      priority: "medium",
      dueDate: new Date(2024, 11, 25),
      tags: ["reunião", "planejamento"],
      notifications: false,
    },
    {
      id: "14",
      title: "Aprovar orçamento Q4",
      description: "Revisão e aprovação do budget trimestral",
      status: "done",
      priority: "high",
      dueDate: new Date(2024, 11, 20),
      tags: ["financeiro", "planejamento"],
      notifications: false,
    },
    {
      id: "15",
      title: "Contratar novo desenvolvedor",
      description: "Processo seletivo finalizado com sucesso",
      status: "done",
      priority: "medium",
      dueDate: new Date(2024, 11, 15),
      tags: ["rh", "recrutamento"],
      notifications: false,
    },
  ]);

  const [showItemPicker, setShowItemPicker] = useState<string | null>(null);

  // Check for upcoming deadlines
  useEffect(() => {
    const checkDeadlines = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      cards.forEach((card) => {
        if (card.notifications && card.dueDate && card.status !== "done") {
          const dueDate = new Date(card.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil === 1) {
            console.log(`⚠️ Tarefa "${card.title}" vence amanhã!`);
          } else if (daysUntil === 0) {
            console.log(`🔴 Tarefa "${card.title}" vence hoje!`);
          } else if (daysUntil < 0) {
            console.log(`❌ Tarefa "${card.title}" está atrasada!`);
          }
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [cards]);

  const columns = [
    {
      id: "todo",
      title: "A Fazer",
      icon: <Circle size={16} />,
    },
    {
      id: "in_progress",
      title: "Em Progresso",
      icon: <Clock size={16} />,
    },
    {
      id: "done",
      title: "Concluído",
      icon: <CheckCircle2 size={16} />,
    },
  ];

  const allTags = Array.from(new Set(cards.flatMap((c) => c.tags || [])));

  const handleAddCard = (status: "todo" | "in_progress" | "done") => {
    const newCard: PlannerCard = {
      id: String(nextIdRef.current++),
      title: "Nova Tarefa",
      status,
      priority: "medium",
      notifications: false,
    };
    setCards([...cards, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
  };

  const handleLinkItem = (cardId: string, item: HierarchicalItem) => {
    setCards(
      cards.map((c) => (c.id === cardId ? { ...c, linkedItemId: item.id } : c))
    );
    setShowItemPicker(null);
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
    items: HierarchicalItem[],
    id: string
  ): HierarchicalItem | null => {
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
    router.push(`/${workspaceId}/${itemId}`);
  };

  const filteredCards = cards.filter((card) => {
    if (
      filterPriority.length > 0 &&
      !filterPriority.includes(card.priority || "")
    )
      return false;
    if (
      filterTags.length > 0 &&
      !card.tags?.some((tag) => filterTags.includes(tag))
    )
      return false;
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getCardsForDate = (date: Date) => {
    return filteredCards.filter((card) => {
      if (!card.dueDate) return false;
      return card.dueDate.toDateString() === date.toDateString();
    });
  };

  const renderMonthCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentDate);
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 bg-white/1 rounded-lg border border-white/3"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayCards = getCardsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isPast = date < new Date() && !isToday;

      days.push(
        <div
          key={day}
          className={`h-24 rounded-lg p-2.5 border transition-all hover:border-blue-500/30 hover:shadow-lg group cursor-pointer ${
            isToday
              ? "bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 shadow-md"
              : isPast
              ? "bg-white/1 border-white/4 opacity-50"
              : "bg-white/2 border-white/6"
          }`}
          onClick={() => setCurrentDate(date)}
        >
          <div
            className={`text-xs font-semibold mb-1.5 flex items-center justify-between ${
              isToday
                ? "text-blue-400"
                : isPast
                ? "text-white/30"
                : "text-white/60"
            }`}
          >
            <span>{day}</span>
            {dayCards.length > 0 && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                {dayCards.length}
              </span>
            )}
          </div>
          <div className="space-y-1 overflow-hidden">
            {dayCards.slice(0, 2).map((card) => (
              <div
                key={card.id}
                className={`text-[10px] px-1.5 py-0.5 rounded truncate transition-all hover:scale-105 bg-white/10 text-white/70 border border-white/20`}
                onClick={(e) => {
                  e.stopPropagation();
                  const cardElement = document.getElementById(
                    `card-${card.id}`
                  );
                  if (cardElement) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => {
                      cardElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      cardElement.classList.add(
                        "ring-2",
                        "ring-blue-400",
                        "ring-offset-2",
                        "ring-offset-background"
                      );
                      setTimeout(() => {
                        cardElement.classList.remove(
                          "ring-2",
                          "ring-blue-400",
                          "ring-offset-2",
                          "ring-offset-background"
                        );
                      }, 2000);
                    }, 300);
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  {card.notifications && <Bell size={8} className="shrink-0" />}
                  <span className="truncate">{card.title}</span>
                </div>
              </div>
            ))}
            {dayCards.length > 2 && (
              <div className="text-[10px] text-white/40 px-1.5 font-medium">
                +{dayCards.length - 2} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div
              key={day}
              className="text-xs font-semibold text-white/50 text-center py-2 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">{days}</div>
      </>
    );
  };

  const renderWeekCalendar = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayCards = getCardsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={i}
          className={`flex-1 rounded-lg p-3 border transition-all hover:border-blue-500/30 cursor-pointer ${
            isToday
              ? "bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30"
              : "bg-white/2 border-white/6"
          }`}
          onClick={() => setCurrentDate(date)}
        >
          <div className="text-center mb-3">
            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
              {date.toLocaleDateString("pt-BR", { weekday: "short" })}
            </div>
            <div
              className={`text-2xl font-bold ${
                isToday ? "text-blue-400" : "text-white/80"
              }`}
            >
              {date.getDate()}
            </div>
          </div>
          <div className="space-y-2">
            {dayCards.map((card) => (
              <div
                key={card.id}
                className="text-xs px-2 py-1.5 rounded transition-all hover:scale-105 cursor-pointer bg-white/10 text-white/70 border border-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  const cardElement = document.getElementById(
                    `card-${card.id}`
                  );
                  if (cardElement) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => {
                      cardElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }, 300);
                  }
                }}
              >
                <div className="font-medium truncate">{card.title}</div>
                {card.description && (
                  <div className="text-[10px] text-white/50 truncate mt-0.5">
                    {card.description}
                  </div>
                )}
              </div>
            ))}
            {dayCards.length === 0 && (
              <div className="text-xs text-white/30 text-center py-4">
                Sem tarefas
              </div>
            )}
          </div>
        </div>
      );
    }

    return <div className="flex gap-2">{days}</div>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Minimalist Header */}
      <div className="px-8 pt-6 pb-4 border-b border-white/6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 pr-3 py-2 bg-white/3 border border-white/6 rounded-lg text-sm outline-none focus:border-white/20 focus:bg-white/5 transition-all w-48 placeholder:text-white/30"
              />
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${
                showFilters ||
                filterPriority.length > 0 ||
                filterTags.length > 0
                  ? "bg-white/8 border-white/20 text-white/90"
                  : "bg-white/3 border-white/6 hover:bg-white/5 text-white/60"
              }`}
            >
              <Filter size={14} />
              {filterPriority.length + filterTags.length > 0 && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {filterPriority.length + filterTags.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-white/2 rounded-lg">
            <div className="flex gap-6">
              <div className="flex-1">
                <label className="text-xs font-medium text-white/50 mb-2 block">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {["high", "medium", "low"].map((priority) => (
                    <button
                      key={priority}
                      onClick={() =>
                        setFilterPriority((prev) =>
                          prev.includes(priority)
                            ? prev.filter((p) => p !== priority)
                            : [...prev, priority]
                        )
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        filterPriority.includes(priority)
                          ? "bg-white/8 border-white/20 text-white/90"
                          : "bg-white/2 border-white/6 text-white/50 hover:bg-white/4"
                      }`}
                    >
                      {priority === "high"
                        ? "Alta"
                        : priority === "medium"
                        ? "Média"
                        : "Baixa"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-white/50 mb-2 block">
                  Tags
                </label>
                <div className="flex gap-2 flex-wrap">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setFilterTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        filterTags.includes(tag)
                          ? "bg-white/8 border-white/20 text-white/90"
                          : "bg-white/2 border-white/6 text-white/50 hover:bg-white/4"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {(filterPriority.length > 0 || filterTags.length > 0) && (
                <button
                  onClick={() => {
                    setFilterPriority([]);
                    setFilterTags([]);
                  }}
                  className="self-end px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Kanban Board – estilo lista vertical (inspirado no Linear) */}
        <div className="flex flex-col gap-4 pb-6 min-h-[360px]">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col h-full">
              {/* Header da coluna (similar ao SocialWorkspace) + ação "Nova tarefa" */}
              <div className="flex items-center justify-between my-3 bg-zinc-900/20 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={
                      col.id === "todo"
                        ? "text-sky-400"
                        : col.id === "in_progress"
                        ? "text-yellow-400"
                        : "text-emerald-400"
                    }
                  >
                    {col.icon}
                  </div>
                  <span className="font-medium text-sm text-white/90">
                    {col.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddCard(col.id as "todo" | "in_progress" | "done")
                    }
                    className="ml-3 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/80 hover:underline underline-offset-2 transition-colors"
                  >
                    <Plus size={12} />
                    <span>Nova tarefa</span>
                  </button>
                </div>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                  {getStatusCount(col.id)}
                </span>
              </div>
              {/* Corpo da coluna - lista compacta separada só por borda */}
              <div className="flex-1 rounded-xl  px-2 py-1.5 space-y-1.5">
                {filteredCards
                  .filter((c) => c.status === col.id)
                  .map((card) => {
                    const linkedItem = card.linkedItemId
                      ? findItem(items, card.linkedItemId)
                      : null;
                    // const isOverdue =
                    //   card.dueDate &&
                    //   new Date(card.dueDate) < new Date() &&
                    //   card.status !== "done";

                    return (
                      <div
                        id={`card-${card.id}`}
                        key={card.id}
                        draggable
                        onDragStart={() => handleDragStart(card.id)}
                        onDragOver={handleDragOver}
                        onDrop={() =>
                          handleDrop(col.id as "todo" | "in_progress" | "done")
                        }
                        onClick={() =>
                          setExpandedCardId((prev) =>
                            prev === card.id ? null : card.id
                          )
                        }
                        className={` px-3 py-3 rounded-md hover:bg-white/2 transition-all group cursor-pointer ${
                          draggedCard === card.id ? "opacity-50" : "opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical
                            size={14}
                            className="text-white/20 group-hover:text-white/30 transition-colors mt-0.5 shrink-0"
                          />
                          <span className="flex-1 bg-transparent font-medium text-sm text-white/90 truncate">
                            {card.title}
                          </span>
                          <div className="transition-opacity flex gap-1 shrink-0">
                            {linkedItem && (
                              <button
                                type="button"
                                onClick={() => navigateToItem(linkedItem.id)}
                                className="text-[10px] text-white/50 hover:text-white/80 transition-colors flex items-center gap-1 max-w-[160px] truncate"
                              >
                                {linkedItem.type === "section" ? (
                                  <Folder
                                    size={11}
                                    className="shrink-0 text-white/40"
                                  />
                                ) : (
                                  <FileIcon
                                    size={11}
                                    className="shrink-0 text-white/40"
                                  />
                                )}
                                <span className="truncate">
                                  {linkedItem.title}
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setCards(
                                  cards.map((c) =>
                                    c.id === card.id
                                      ? {
                                          ...c,
                                          notifications: !c.notifications,
                                        }
                                      : c
                                  )
                                )
                              }
                              className={`p-1 rounded transition-all ${
                                card.notifications
                                  ? "text-white/60 bg-white/5"
                                  : "text-white/30 hover:text-white/50"
                              }`}
                            >
                              {card.notifications ? (
                                <Bell size={12} />
                              ) : (
                                <BellOff size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => setShowItemPicker(card.id)}
                              className="text-white/30 hover:text-white/60 transition-all p-1"
                            >
                              <LinkIcon size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="text-white/30 hover:text-white/60 transition-all p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* {card.description && expandedCardId === card.id && (
                          <textarea
                            value={card.description || ""}
                            onChange={(e) =>
                              setCards(
                                cards.map((c) =>
                                  c.id === card.id
                                    ? { ...c, description: e.target.value }
                                    : c
                                )
                              )
                            }
                            placeholder="Descrição..."
                            className="bg-transparent text-xs text-white/50 w-full outline-none resize-none min-h-[2em] mb-2 placeholder:text-white/20"
                            rows={1}
                          />
                        )} */}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Section */}
        <div className="border-t border-white/6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white/80">Calendário</h2>
            <div className="flex gap-2">
              {/* View Toggle */}
              <div className="flex bg-white/2 border border-white/6 rounded-lg p-0.5">
                <button
                  onClick={() => setCalendarView("week")}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                    calendarView === "week"
                      ? "bg-white/8 text-white/90"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <Rows size={12} />
                  Semana
                </button>
                <button
                  onClick={() => setCalendarView("month")}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                    calendarView === "month"
                      ? "bg-white/8 text-white/90"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <LayoutGrid size={12} />
                  Mês
                </button>
              </div>

              {/* Navigation */}
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1
                    )
                  )
                }
                className="p-2 hover:bg-white/5 rounded-lg transition-all border border-white/6"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-2 hover:bg-white/5 rounded-lg transition-all text-xs font-medium border border-white/6"
              >
                Hoje
              </button>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1
                    )
                  )
                }
                className="p-2 hover:bg-white/5 rounded-lg transition-all border border-white/6"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <p className="text-sm text-white/60 mb-4">
            {currentDate.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>

          {/* Calendário interativo (semana / mês) */}
          {calendarView === "week"
            ? renderWeekCalendar()
            : renderMonthCalendar()}
        </div>
      </div>

      {showItemPicker && (
        <ItemPicker
          onSelect={(item) => handleLinkItem(showItemPicker, item)}
          onCancel={() => setShowItemPicker(null)}
        />
      )}
    </div>
  );
}
