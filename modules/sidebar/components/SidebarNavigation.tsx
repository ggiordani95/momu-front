"use client";

import { useState, useEffect } from "react";
import SidebarItem from "@/modules/sidebar/components/SidebarItem";
import { useWorkspaceStore } from "@/modules/workspace/stores/workspaceStore";
import { buildHierarchy } from "@/modules/files";
import { type ItemType } from "@/modules/files/types/filesTypes";
import { HierarchicalFile } from "@/lib/types";
import { useMemo } from "react";
import { useUpdateFile } from "@/modules/files";

interface TopicItem {
  id: string;
  type: ItemType;
  title: string;
  parent_id?: string;
  children?: TopicItem[];
}

interface SidebarNavigationProps {
  items: TopicItem[];
  workspaceId?: string;
}

export default function SidebarNavigation({
  items: initialItems,
  workspaceId,
}: SidebarNavigationProps) {
  const [activeId, setActiveId] = useState("");

  // Get files from Zustand store if workspaceId is provided
  const { getFilesByWorkspace } = useWorkspaceStore();
  const workspaceFiles = workspaceId ? getFilesByWorkspace(workspaceId) : [];
  const zustandItems = useMemo(
    () => buildHierarchy(workspaceFiles),
    [workspaceFiles]
  );

  const derivedWorkspaceId =
    workspaceId ||
    (zustandItems[0] as HierarchicalFile | undefined)?.workspace_id ||
    (initialItems[0] as HierarchicalFile | undefined)?.workspace_id ||
    null;

  const updateItemMutation = useUpdateFile(derivedWorkspaceId || "");

  // Use items from Zustand if available, otherwise use initialItems
  const items = zustandItems.length > 0 ? zustandItems : initialItems;

  useEffect(() => {
    // Set initial activeId from URL hash after mount (only on client)
    // Use requestAnimationFrame to ensure DOM is ready and avoid hydration mismatch
    const setInitialActiveId = () => {
      if (window.location.hash) {
        setActiveId(window.location.hash.slice(1));
      }
    };
    requestAnimationFrame(setInitialActiveId);

    // Track scroll position to highlight current section
    const handleScroll = () => {
      const sections = document.querySelectorAll("[id]");
      let currentId = "";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentId = section.id;
        }
      });

      if (currentId) {
        setActiveId(currentId);
      }
    };

    // Listen to hash changes
    const handleHashChange = () => {
      if (window.location.hash) {
        setActiveId(window.location.hash.slice(1));
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("hashchange", handleHashChange);

    // Initial check after a small delay to ensure DOM is ready
    setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const updateItem = (id: string, field: "title", value: string) => {
    const previousItems = items as TopicItem[];
    const updateItemRecursive = (items: TopicItem[]): TopicItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        if (item.children) {
          return { ...item, children: updateItemRecursive(item.children) };
        }
        return item;
      });
    };

    const updatedItems = updateItemRecursive(items as TopicItem[]);
    // Zustand handles state updates automatically via mutations

    if (!derivedWorkspaceId) {
      console.error(
        "Não foi possível identificar o workspace para atualizar o item."
      );
      return;
    }

    updateItemMutation.mutate(
      { fileId: id, data: { [field]: value } },
      {
        onError: (error) => {
          console.error("Error updating item:", error);
          // Zustand will handle rollback via React Query
        },
      }
    );
  };

  const deleteItem = (id: string) => {
    const deleteItemRecursive = (items: TopicItem[]): TopicItem[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.children) {
            return { ...item, children: deleteItemRecursive(item.children) };
          }
          return item;
        });
    };

    const updatedItems = deleteItemRecursive(items as TopicItem[]);
    // Zustand handles state updates automatically via mutations

    if (!derivedWorkspaceId) {
      console.error(
        "Não foi possível identificar o workspace para atualizar o item."
      );
      return;
    }

    updateItemMutation.mutate({
      fileId: id,
      data: { active: false },
    });
  };

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item as TopicItem}
          level={0}
          activeId={activeId}
          onUpdate={updateItem}
          onDelete={deleteItem}
        />
      ))}
    </nav>
  );
}
