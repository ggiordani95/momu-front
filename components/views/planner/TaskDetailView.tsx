"use client";

import React, { useState } from "react";
import {
  Trash2,
  Bell,
  BellOff,
  Link as LinkIcon,
  ExternalLink,
  Folder,
  File as FileIcon,
  Calendar,
  Tag,
  Edit2,
  MoreVertical,
  Star,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Plus,
  Paperclip,
  Search,
  X,
} from "lucide-react";
import { HierarchicalItem } from "@/lib/types";
import { ItemPicker } from "@/components/ItemPicker";

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

interface TaskDetailViewProps {
  card: PlannerCard;
  linkedItem: HierarchicalItem | null;
  onBack: () => void;
  onUpdate: (updatedCard: PlannerCard) => void;
  onDelete: (cardId: string) => void;
  onLinkItem: (item: HierarchicalItem) => void;
  onNavigateToItem: (itemId: string) => void;
}

export function TaskDetailView({
  card,
  linkedItem,
  onBack,
  onUpdate,
  onDelete,
  onLinkItem,
  onNavigateToItem,
}: TaskDetailViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedDescription, setEditedDescription] = useState(
    card.description || ""
  );
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [comment, setComment] = useState("");

  const handleSaveTitle = () => {
    onUpdate({ ...card, title: editedTitle });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    onUpdate({ ...card, description: editedDescription });
    setIsEditingDescription(false);
  };

  const handleStatusChange = (newStatus: "todo" | "in_progress" | "done") => {
    onUpdate({ ...card, status: newStatus });
  };

  const handlePriorityChange = (newPriority: "low" | "medium" | "high") => {
    onUpdate({ ...card, priority: newPriority });
  };

  const handleToggleNotifications = () => {
    onUpdate({ ...card, notifications: !card.notifications });
  };

  const handleDelete = () => {
    onDelete(card.id);
    onBack();
  };

  const getStatusIcon = () => {
    switch (card.status) {
      case "todo":
        return <Circle size={16} className="text-white/40" />;
      case "in_progress":
        return <Clock size={16} className="text-yellow-400" />;
      case "done":
        return <CheckCircle2 size={16} className="text-emerald-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (card.status) {
      case "todo":
        return "A Fazer";
      case "in_progress":
        return "Em Progresso";
      case "done":
        return "Concluído";
    }
  };

  const getPriorityLabel = () => {
    switch (card.priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return "Sem prioridade";
    }
  };

  const getPriorityColor = () => {
    switch (card.priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-emerald-400";
      default:
        return "text-white/40";
    }
  };

  return (
    <div className="h-full flex bg-background">
      {/* Main Content - Left Side */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Breadcrumb */}
        <div className="px-8 pt-6 pb-4 border-b border-white/6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <button
                onClick={onBack}
                className="hover:text-white/90 transition-colors"
              >
                Planner
              </button>
              <ChevronRight size={14} className="text-white/30" />
              <span className="text-white/90 font-medium">{card.id}</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <Star size={16} />
              </button>
              <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle();
                    } else if (e.key === "Escape") {
                      setEditedTitle(card.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full text-3xl font-semibold text-white/90 bg-transparent border-b-2 border-white/20 focus:border-white/40 outline-none pb-2"
                  autoFocus
                />
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <h1 className="text-3xl font-semibold text-white/90">
                    {card.title}
                  </h1>
                  <Edit2
                    size={20}
                    className="text-white/0 group-hover:text-white/40 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <Search size={16} />
              </button>
              <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <Paperclip size={16} />
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 hover:bg-white/5 transition-all border border-white/10">
                <Plus size={14} className="inline mr-1" />
                Adicionar sub-tarefas
              </button>
            </div>
            {/* Resources Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white/70">
                  Recursos
                </h2>
                {!linkedItem && (
                  <button
                    onClick={() => setShowItemPicker(true)}
                    className="text-xs text-white/50 hover:text-white/70 transition-colors"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
              {linkedItem && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all group">
                  <div className="flex items-center gap-3">
                    {linkedItem.type === "folder" ? (
                      <Folder size={18} className="text-sky-400 shrink-0" />
                    ) : (
                      <FileIcon size={18} className="text-blue-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-white/90">
                        {linkedItem.title}
                      </div>
                      <div className="text-xs text-white/50">
                        {linkedItem.type === "folder" ? "Pasta" : "Arquivo"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToItem(linkedItem.id)}
                      className="p-1 rounded text-white/0 group-hover:text-white/40 hover:bg-white/10 transition-all"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button className="p-1 rounded text-white/0 group-hover:text-white/40 hover:bg-white/10 transition-all">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-sm font-semibold text-white/70 mb-3">
                Descrição
              </h2>
              {isEditingDescription ? (
                <div className="space-y-3">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full min-h-[150px] px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 outline-none text-white/90 placeholder:text-white/30 resize-none text-sm"
                    placeholder="Adicione uma descrição..."
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition-all"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditedDescription(card.description || "");
                        setIsEditingDescription(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 min-h-[100px] cursor-pointer hover:bg-white/[0.07] transition-all group"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {card.description ? (
                    <p className="text-sm text-white/70 whitespace-pre-wrap">
                      {card.description}
                    </p>
                  ) : (
                    <p className="text-sm text-white/30 italic">
                      Clique para adicionar uma descrição...
                    </p>
                  )}
                  <Edit2
                    size={14}
                    className="text-white/0 group-hover:text-white/30 mt-2 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Activity Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white/70">
                  Atividade
                </h2>
                <button
                  onClick={handleToggleNotifications}
                  className={`text-xs font-medium transition-all ${
                    card.notifications
                      ? "text-white/70"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {card.notifications ? "Inscrito" : "Inscrever"}
                </button>
              </div>

              {/* Activity Items */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User size={14} className="text-white/60" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/70">
                      <span className="font-medium">Sistema</span> criou a
                      tarefa.{" "}
                      <span className="text-white/50">há alguns minutos</span>
                    </div>
                  </div>
                </div>

                {linkedItem && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <LinkIcon size={14} className="text-white/60" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/70">
                        <span className="font-medium">Sistema</span> linkou{" "}
                        <span className="font-medium">{linkedItem.title}</span>.{" "}
                        <span className="text-white/50">há alguns minutos</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comment Input - Linear Style */}
              <div className="mt-6 pt-6 border-t border-white/6">
                <div className="relative">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Deixe um comentário..."
                    className="w-full px-4 py-3 pr-20 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 outline-none text-white/90 placeholder:text-white/30 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        // Handle comment submit
                        setComment("");
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                      <Paperclip size={14} />
                    </button>
                    <button
                      disabled={!comment.trim()}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white/70 transition-all"
                    >
                      <ChevronRight size={14} className="-rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Right Side */}
      <div className="w-80 border-l border-white/6 bg-white/2 flex flex-col">
        <div className="p-6 border-b border-white/6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white/70">
              Propriedades
            </h3>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <LinkIcon size={14} />
              </button>
              <button className="p-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-2 block">
                Status
              </label>
              <button
                onClick={() => {
                  const nextStatus =
                    card.status === "todo"
                      ? "in_progress"
                      : card.status === "in_progress"
                      ? "done"
                      : "todo";
                  handleStatusChange(nextStatus);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                {getStatusIcon()}
                <span className="flex-1 text-left text-sm text-white/70">
                  {getStatusLabel()}
                </span>
                <ChevronRight
                  size={14}
                  className="text-white/0 group-hover:text-white/40 transition-colors"
                />
              </button>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-2 block">
                Prioridade
              </label>
              <button
                onClick={() => {
                  const nextPriority =
                    card.priority === "low"
                      ? "medium"
                      : card.priority === "medium"
                      ? "high"
                      : "low";
                  handlePriorityChange(nextPriority || "low");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    card.priority === "high"
                      ? "bg-red-400"
                      : card.priority === "medium"
                      ? "bg-yellow-400"
                      : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`flex-1 text-left text-sm ${getPriorityColor()}`}
                >
                  {getPriorityLabel()}
                </span>
                <ChevronRight
                  size={14}
                  className="text-white/0 group-hover:text-white/40 transition-colors"
                />
              </button>
            </div>

            {/* Assignee (placeholder) */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-2 block">
                Responsável
              </label>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group">
                <User size={16} className="text-white/40" />
                <span className="flex-1 text-left text-sm text-white/50">
                  Não atribuído
                </span>
                <ChevronRight
                  size={14}
                  className="text-white/0 group-hover:text-white/40 transition-colors"
                />
              </button>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-white/50 mb-2 block">
                Tags
              </label>
              <div className="space-y-2">
                {card.tags && card.tags.length > 0 ? (
                  card.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      <Tag size={14} className="text-white/40" />
                      <span className="flex-1 text-sm text-white/70">
                        {tag}
                      </span>
                      <button className="p-1 rounded text-white/0 group-hover:text-white/40 hover:bg-white/10 transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-dashed border-white/20 transition-all text-sm text-white/50">
                    <Plus size={14} />
                    <span>Adicionar tag</span>
                  </button>
                )}
              </div>
            </div>

            {/* Due Date */}
            {card.dueDate && (
              <div>
                <label className="text-xs font-medium text-white/50 mb-2 block">
                  Data de Vencimento
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <Calendar size={16} className="text-white/40" />
                  <span className="text-sm text-white/70">
                    {new Date(card.dueDate).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/6 space-y-2">
              <button
                onClick={handleToggleNotifications}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  card.notifications
                    ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70"
                }`}
              >
                {card.notifications ? (
                  <Bell size={16} />
                ) : (
                  <BellOff size={16} />
                )}
                <span className="text-sm font-medium">
                  {card.notifications
                    ? "Notificações ativas"
                    : "Ativar notificações"}
                </span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-400/10 border border-white/10 hover:border-red-400/20 text-white/70 hover:text-red-400 transition-all"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium">Excluir tarefa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showItemPicker && (
        <ItemPicker
          onSelect={(item) => {
            onLinkItem(item);
            setShowItemPicker(false);
          }}
          onCancel={() => setShowItemPicker(false)}
        />
      )}
    </div>
  );
}
