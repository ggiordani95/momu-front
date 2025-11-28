"use client";

import { useState, useEffect } from "react";
import SimpleSidebar from "./components/SimpleSidebar";
import FileExplorer from "./components/FileExplorer";
import { ItemsProvider, useItems } from "./components/ItemsContext";
import SettingsView from "./components/SettingsView";
import PageEditor from "./components/PageEditor";
import { type ItemType } from "@/lib/itemTypes";

interface TopicItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  youtube_id?: string;
  youtube_url?: string;
  parent_id?: string;
  children?: TopicItem[];
  order_index?: number;
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

export default function Home() {
  const [currentView, setCurrentView] = useState<"explorer" | "settings">(
    "explorer"
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TopicItem | null>(null);
  const [items, setItems] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicId, setTopicId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Get first topic
        const topicsRes = await fetch("http://localhost:3001/topics", {
          cache: "no-store",
        });
        if (!topicsRes.ok) return;
        const topics = await topicsRes.json();
        if (topics.length === 0) {
          setLoading(false);
          return;
        }

        const firstTopicId = topics[0].id;
        setTopicId(firstTopicId);

        // Get items from first topic
        const itemsRes = await fetch(
          `http://localhost:3001/topics/${firstTopicId}/items`,
          {
            cache: "no-store",
          }
        );
        if (!itemsRes.ok) return;
        const itemsData = await itemsRes.json();
        const hierarchicalItems = buildHierarchy(itemsData);
        setItems(hierarchicalItems);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleItemClick = (item: TopicItem) => {
    // Handle item click (open page, video, etc.)
    if (item.type === "video" && item.youtube_url) {
      window.open(item.youtube_url, "_blank");
    } else if (item.type === "note" || item.type === "task") {
      // Open page for editing
      setSelectedItem(item);
    }
  };

  const handleItemUpdate = async (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    // Update item in local state
    const updateItem = (items: TopicItem[]): TopicItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        if (item.children) {
          return { ...item, children: updateItem(item.children) };
        }
        return item;
      });
    };

    const updatedItems = updateItem(items);
    setItems(updatedItems);

    // Send to backend
    try {
      await fetch(`http://localhost:3001/topics/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleBack = () => {
    setCurrentFolderId(null);
  };

  const handleAddItem = async (itemData: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => {
    if (!topicId) return;

    try {
      // Create item in backend
      const res = await fetch(`http://localhost:3001/topics/${topicId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (!res.ok) {
        console.error("Error creating item");
        return;
      }

      const newItem = await res.json();

      // Add to local state
      const addToParent = (
        items: TopicItem[],
        newItem: TopicItem,
        parentId?: string
      ): TopicItem[] => {
        if (!parentId) {
          return [...items, { ...newItem, children: [] }];
        }

        return items.map((item) => {
          if (item.id === parentId) {
            return {
              ...item,
              children: [
                ...(item.children || []),
                { ...newItem, children: [] },
              ],
            };
          }
          if (item.children) {
            return {
              ...item,
              children: addToParent(item.children, newItem, parentId),
            };
          }
          return item;
        });
      };

      const updatedItems = addToParent(items, newItem, itemData.parent_id);
      setItems(updatedItems);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-foreground/60">Carregando...</p>
      </div>
    );
  }

  return (
    <ItemsProvider initialItems={items}>
      <HomeContent
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentFolderId={currentFolderId}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        handleFolderClick={handleFolderClick}
        handleItemClick={handleItemClick}
        handleBack={handleBack}
        handleItemUpdate={handleItemUpdate}
        handleAddItem={handleAddItem}
        items={items}
      />
    </ItemsProvider>
  );
}

function HomeContent({
  currentView,
  setCurrentView,
  currentFolderId,
  selectedItem,
  setSelectedItem,
  handleFolderClick,
  handleItemClick,
  handleBack,
  handleItemUpdate,
  handleAddItem,
  items,
}: {
  currentView: "explorer" | "settings";
  setCurrentView: (view: "explorer" | "settings") => void;
  currentFolderId: string | null;
  selectedItem: TopicItem | null;
  setSelectedItem: (item: TopicItem | null) => void;
  handleFolderClick: (folderId: string) => void;
  handleItemClick: (item: TopicItem) => void;
  handleBack: () => void;
  handleItemUpdate: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  handleAddItem: (item: {
    type: ItemType;
    title: string;
    content?: string;
    youtube_url?: string;
    parent_id?: string;
  }) => void;
  items: TopicItem[];
}) {
  const itemsContext = useItems();

  // Sync items with context when they change
  useEffect(() => {
    if (itemsContext) {
      itemsContext.setItems(items);
    }
  }, [items, itemsContext]);

  return (
    <div
      className="flex h-screen overflow-hidden relative bg-background"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Glassmorphism background */}
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
      <SimpleSidebar onNavigate={setCurrentView} currentView={currentView} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {currentView === "explorer" ? (
          selectedItem &&
          (selectedItem.type === "note" || selectedItem.type === "task") ? (
            <PageEditor
              item={selectedItem}
              onBack={() => setSelectedItem(null)}
              onUpdate={handleItemUpdate}
            />
          ) : (
            <FileExplorer
              currentFolderId={currentFolderId}
              onFolderClick={handleFolderClick}
              onItemClick={handleItemClick}
              onBack={currentFolderId ? handleBack : undefined}
              onAddItem={handleAddItem}
            />
          )
        ) : (
          <SettingsView />
        )}
      </main>
    </div>
  );
}
