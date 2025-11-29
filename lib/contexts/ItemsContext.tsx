"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { HierarchicalItem } from "@/lib/types";

interface ItemsContextType {
  items: HierarchicalItem[];
  setItems: (items: HierarchicalItem[]) => void;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({
  initialItems,
  children,
}: {
  initialItems: HierarchicalItem[];
  children: ReactNode;
}) {
  const [items, setItems] = useState(initialItems);

  // Log when items change
  useEffect(() => {
    console.log("📦 ItemsContext items updated:", {
      count: items.length,
      ids: items.map((i) => i.id),
    });
  }, [items]);

  return (
    <ItemsContext.Provider value={{ items, setItems }}>
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);
  return context; // Returns undefined if not within provider
}
