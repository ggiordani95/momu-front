"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
