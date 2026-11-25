"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Bath, PawPrint, Plus, ShoppingBag, Utensils } from "lucide-react";
import { ItemSheet, type ItemFormValues } from "@/components/item-sheet";
import {
  getItemsSnapshot,
  getServerItemsSnapshot,
  saveItems,
  subscribeItems,
} from "@/lib/storage";
import type { Category, Item, ItemStatus } from "@/types/item";

type FilterId = "all" | Category;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "bathroom", label: "厨卫" },
  { id: "kitchen", label: "饮食" },
  { id: "pet", label: "宠物" },
  { id: "other", label: "其他" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  bathroom: "厨卫",
  kitchen: "饮食",
  pet: "宠物",
  other: "其他",
};

const STATUS_RANK: Record<ItemStatus, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  green: "yellow",
  yellow: "red",
  red: "green",
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  green: "充足",
  yellow: "快没了",
  red: "立刻买",
};

const STATUS_DOT: Record<ItemStatus, string> = {
  green: "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.16)]",
  yellow: "bg-amber-400 shadow-[0_0_0_6px_rgba(251,191,36,0.28)]",
  red: "bg-rose-500 shadow-[0_0_0_6px_rgba(244,63,94,0.16)]",
};

const STATUS_TEXT: Record<ItemStatus, string> = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-rose-600",
};

const CATEGORY_ICON = {
  bathroom: Bath,
  kitchen: Utensils,
  pet: PawPrint,
  other: ShoppingBag,
} as const;

function sortByUrgency(items: Item[]) {
  return [...items].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function StockBoard() {
  const items = useSyncExternalStore(
    subscribeItems,
    getItemsSnapshot,
    getServerItemsSnapshot,
  );
  const [filter, setFilter] = useState<FilterId>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  function commitItems(updater: (current: Item[]) => Item[]) {
    saveItems(updater(items));
  }

  const visibleItems = useMemo(() => {
    const filtered =
      filter === "all" ? items : items.filter((item) => item.category === filter);
    return sortByUrgency(filtered);
  }, [filter, items]);

  const statusCounts = useMemo(() => {
    let red = 0;
    let yellow = 0;
    let green = 0;
    for (const item of visibleItems) {
      if (item.status === "red") red += 1;
      else if (item.status === "yellow") yellow += 1;
      else green += 1;
    }
    return { red, yellow, green };
  }, [visibleItems]);

  function cycleStatus(id: string) {
    commitItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: NEXT_STATUS[item.status] } : item,
      ),
    );
  }

  function openAddSheet() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  function openEditSheet(item: Item) {
    setEditingItem(item);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  function handleSaveItem(values: ItemFormValues) {
    if (editingItem) {
      commitItems((current) =>
        current.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: values.name,
                category: values.category,
                status: values.status,
                amazonAsin: values.amazonAsin,
                defaultQty: values.defaultQty,
              }
            : item,
        ),
      );
    } else {
      const newItem: Item = {
        id: createId(),
        name: values.name,
        category: values.category,
        status: values.status,
        amazonAsin: values.amazonAsin,
        defaultQty: values.defaultQty,
        lastRestockedAt: new Date().toISOString(),
      };
      commitItems((current) => [newItem, ...current]);
    }
    setSheetOpen(false);
  }

  function handleDeleteItem(id: string) {
    commitItems((current) => current.filter((item) => item.id !== id));
    setSheetOpen(false);
  }

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900">
      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
              HOMESTOCK
            </p>
            <h1 className="mt-2 text-[1.7rem] font-semibold tracking-tight">
              家里还够不够
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              点右侧的灯切换状态，点击卡片可编辑或删除。
            </p>
          </div>
          <button
            type="button"
            onClick={openAddSheet}
            aria-label="新增物品"
            className="mt-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0_4px_14px_rgba(24,24,27,0.22)] transition-transform active:scale-95 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </button>
        </header>

        <div
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="分类筛选"
        >
          {FILTERS.map((option) => {
            const selected = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(option.id)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                  selected
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-600 shadow-sm hover:bg-zinc-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-zinc-500">
          <span>{visibleItems.length} 件 · 红灯优先</span>
          <div className="flex items-center gap-3" aria-label="状态统计">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500" aria-hidden="true" />
              {statusCounts.red}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-400" aria-hidden="true" />
              {statusCounts.yellow}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {statusCounts.green}
            </span>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(24,24,27,0.04),0_10px_24px_rgba(24,24,27,0.05)]">
            <p className="text-sm font-medium text-zinc-600">
              {items.length === 0 ? "还没有记录任何日用品" : "当前分类下还没有物品"}
            </p>
            <button
              type="button"
              onClick={openAddSheet}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <Plus className="size-3.5" />
              添加一件
            </button>
          </div>
        ) : (
          <ul
            className="mt-3 flex flex-col gap-3"
            role="tabpanel"
            aria-label="日用品库存列表"
          >
            {visibleItems.map((item) => {
              const Icon = CATEGORY_ICON[item.category];
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_10px_24px_rgba(24,24,27,0.05)]"
                >
                  <button
                    type="button"
                    onClick={() => openEditSheet(item)}
                    aria-label={`编辑 ${item.name}`}
                    className="min-w-0 flex-1 cursor-pointer rounded-2xl py-0.5 text-left transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <p className="truncate text-base font-medium">{item.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>{CATEGORY_LABEL[item.category]}</span>
                      {item.defaultQty > 1 && (
                        <span>· 每次 {item.defaultQty} 件</span>
                      )}
                      {item.amazonAsin && (
                        <span className="font-mono text-[11px] text-zinc-400">
                          · {item.amazonAsin}
                        </span>
                      )}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleStatus(item.id)}
                    aria-label={`${item.name}，当前${STATUS_LABEL[item.status]}，点击切换`}
                    className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-1 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <span
                      className={`size-8 rounded-full transition-colors ${STATUS_DOT[item.status]}`}
                    />
                    <span
                      className={`text-[11px] font-medium leading-none ${STATUS_TEXT[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {sheetOpen && (
        <ItemSheet
          key={editingItem?.id ?? "new"}
          editingItem={editingItem}
          onClose={closeSheet}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
        />
      )}
    </div>
  );
}
