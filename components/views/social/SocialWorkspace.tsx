"use client";

import { useState } from "react";
import { 
  Twitter, 
  Linkedin, 
  Instagram, 
  Plus, 
  MoreHorizontal, 
  Calendar,
  CheckCircle2,
  Clock,
  PenTool,
  Share2
} from "lucide-react";

interface SocialPost {
  id: string;
  content: string;
  platform: "twitter" | "linkedin" | "instagram";
  status: "idea" | "draft" | "scheduled" | "published";
  date?: string;
}

export function SocialWorkspace() {
  const [posts, setPosts] = useState<SocialPost[]>([
    {
      id: "1",
      content: "Lançamento da nova feature do Momu! 🚀 #SaaS #Productivity",
      platform: "twitter",
      status: "draft",
    },
    {
      id: "2",
      content: "Como organizar seu fluxo de trabalho com o Momu Cloud OS.",
      platform: "linkedin",
      status: "idea",
    },
    {
      id: "3",
      content: "Bastidores do desenvolvimento...",
      platform: "instagram",
      status: "scheduled",
      date: "Amanhã, 14:00",
    },
  ]);

  const columns = [
    { id: "idea", title: "Ideias", icon: <PenTool size={16} className="text-yellow-500" /> },
    { id: "draft", title: "Rascunho", icon: <FileTextIcon size={16} className="text-blue-500" /> },
    { id: "scheduled", title: "Agendado", icon: <Clock size={16} className="text-purple-500" /> },
    { id: "published", title: "Publicado", icon: <CheckCircle2 size={16} className="text-green-500" /> },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitter": return <Twitter size={14} className="text-sky-500" />;
      case "linkedin": return <Linkedin size={14} className="text-blue-700" />;
      case "instagram": return <Instagram size={14} className="text-pink-600" />;
      default: return <Share2 size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Social Hub</h1>
        <p className="text-foreground/60">Gerencie sua presença digital e planeje seu conteúdo.</p>
      </div>

      {/* Connected Accounts */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-4">Contas Conectadas</h2>
        <div className="flex gap-4">
          <AccountCard icon={<Twitter size={24} className="text-sky-500" />} name="Twitter" handle="@momu_os" connected />
          <AccountCard icon={<Linkedin size={24} className="text-blue-700" />} name="LinkedIn" handle="Momu Inc." connected />
          <AccountCard icon={<Instagram size={24} className="text-pink-600" />} name="Instagram" handle="@momu.app" connected={false} />
        </div>
      </div>

      {/* Content Planner (Kanban) */}
      <div className="flex-1 min-h-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider">Planejador de Conteúdo</h2>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} />
            Novo Post
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6 h-full">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4 px-2">
                {col.icon}
                <span className="font-medium text-sm">{col.title}</span>
                <span className="ml-auto text-xs text-foreground/40 bg-foreground/5 px-2 py-0.5 rounded-full">
                  {posts.filter(p => p.status === col.id).length}
                </span>
              </div>
              
              <div className="flex-1 bg-foreground/5 rounded-xl p-3 space-y-3">
                {posts.filter(p => p.status === col.id).map((post) => (
                  <div key={post.id} className="bg-background border border-border/50 p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground/70 bg-foreground/5 px-2 py-1 rounded-md">
                        {getPlatformIcon(post.platform)}
                        <span className="capitalize">{post.platform}</span>
                      </div>
                      <button className="text-foreground/20 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-3 mb-3">{post.content}</p>
                    {post.date && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground/50 mt-2 pt-2 border-t border-border/30">
                        <Calendar size={12} />
                        {post.date}
                      </div>
                    )}
                  </div>
                ))}
                
                {posts.filter(p => p.status === col.id).length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-foreground/10 rounded-lg text-foreground/20 text-sm">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountCard({ icon, name, handle, connected }: { icon: React.ReactNode, name: string, handle: string, connected: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all w-64 ${connected ? 'bg-background border-border/50' : 'bg-foreground/5 border-transparent opacity-70'}`}>
      <div className="p-2.5 bg-foreground/5 rounded-lg">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-sm">{name}</h3>
        <p className="text-xs text-foreground/60">{connected ? handle : 'Não conectado'}</p>
      </div>
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-foreground/20'}`} />
    </div>
  );
}

function FileTextIcon({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
