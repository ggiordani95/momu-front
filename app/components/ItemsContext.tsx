"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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

interface ItemsContextType {
  items: TopicItem[];
  setItems: (items: TopicItem[]) => void;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({
  initialItems,
  children,
}: {
  initialItems: TopicItem[];
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
