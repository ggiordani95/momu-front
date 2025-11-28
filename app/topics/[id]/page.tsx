import Link from "next/link";
import { ChevronLeft, Plus, MoreHorizontal } from "lucide-react";
import SidebarNavigation from "../../components/SidebarNavigation";
import ContentArea from "../../components/ContentArea";
import { ItemsProvider } from "../../components/ItemsContext";
import { type ItemType } from "@/lib/itemTypes";

async function getTopicItems(id: string) {
  try {
    const res = await fetch(`http://localhost:3001/topics/${id}/items`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

async function getTopic(id: string) {
  try {
    const res = await fetch("http://localhost:3001/topics", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const topics = await res.json();
    return topics.find((t: any) => t.id === id) || null;
  } catch (e) {
    return null;
  }
}

interface TopicItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  youtube_id?: string;
  parent_id?: string;
  order_index: number;
}

// Build hierarchical structure
function buildHierarchy(items: TopicItem[]): TopicItem[] {
  const itemMap = new Map<string, TopicItem & { children?: TopicItem[] }>();
  const rootItems: (TopicItem & { children?: TopicItem[] })[] = [];

  // First pass: create map
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  items.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children!.push(node);
      } else {
        rootItems.push(node);
      }
    } else {
      rootItems.push(node);
    }
  });

  return rootItems;
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [topic, items] = await Promise.all([getTopic(id), getTopicItems(id)]);

  const hierarchicalItems = buildHierarchy(items);

  return (
    <ItemsProvider initialItems={hierarchicalItems}>
      <div className="flex h-screen overflow-hidden relative bg-background">
        {/* Glassmorphism background with 2-color gradient */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(circle 600px at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 70%), radial-gradient(circle 500px at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 70%), radial-gradient(ellipse 130% 110% at 50% 50%, rgba(0, 0, 0, 0.9) 0%, rgba(11, 10, 10, 0.97) 100%)",
            backdropFilter: "blur(50px) saturate(180%)",
            WebkitBackdropFilter: "blur(50px) saturate(180%)",
          }}
        />
        {/* Sidebar */}
        <aside
          className="w-64 bg-black/80 shrink-0 border-r flex flex-col relative z-10"
          style={{
            borderColor: "var(--border-color)",
          }}
        >
          <div
            className="p-4 border-b"
            style={{ borderColor: "var(--border-color)" }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
              Voltar
            </Link>
          </div>
          <div className="p-4">
            <h2 className="font-semibold mb-4 truncate" title={topic?.title}>
              {topic?.title || "Tópico"}
            </h2>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-hover mb-4">
              <Plus size={16} />
              Adicionar Item
            </button>
            <SidebarNavigation items={hierarchicalItems} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-4xl mx-auto px-12 py-16">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1
                  className="text-5xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {topic?.title || "Tópico"}
                </h1>
                <button className="p-2 rounded-md hover:bg-hover transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              {topic?.description && (
                <p className="text-lg opacity-60">{topic.description}</p>
              )}
            </div>
            {/* Content */}
            <ContentArea initialItems={hierarchicalItems} topicId={id} />
          </div>
        </main>
      </div>
    </ItemsProvider>
  );
}
