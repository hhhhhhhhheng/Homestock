"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  Bath,
  Check,
  Copy,
  PawPrint,
  Plus,
  RefreshCw,
  ShoppingBag,
  Users,
  Utensils,
} from "lucide-react";
import { HouseholdSheet } from "@/components/household-sheet";
import { ItemSheet, type ItemFormValues } from "@/components/item-sheet";
import { RestockBar } from "@/components/restock-bar";
import { buildAmazonBatchCartUrl } from "@/lib/amazon";
import {
  getHouseholdCodeSnapshot,
  getServerHouseholdCodeSnapshot,
  saveHouseholdCode,
  subscribeHouseholdCode,
} from "@/lib/household";
import {
  createHouseholdItem,
  deleteHouseholdItem,
  loadHouseholdItems,
  markHouseholdItemsRestocked,
  rowToItem,
  updateHouseholdItem,
  type ItemRow,
} from "@/lib/items-service";
import { getSupabaseClient } from "@/lib/supabase";
import type { Category, Item, ItemStatus } from "@/types/item";

type FilterId = "all" | Category;
type SyncState = "connecting" | "live" | "error";

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

export function StockBoard() {
  const householdId = useSyncExternalStore(
    subscribeHouseholdCode,
    getHouseholdCodeSnapshot,
    getServerHouseholdCodeSnapshot,
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterId>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [householdSheetOpen, setHouseholdSheetOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [includeYellow, setIncludeYellow] = useState(false);
  const [markingBought, setMarkingBought] = useState(false);

  const refreshItems = useCallback(async (targetHouseholdId: string) => {
    setLoading(true);
    setErrorMessage(null);
    setSyncState("connecting");
    try {
      const loaded = await loadHouseholdItems(targetHouseholdId);
      setItems(loaded);
      setSyncState("live");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "加载云端数据失败",
      );
      setSyncState("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!householdId) return;

    let cancelled = false;

    loadHouseholdItems(householdId)
      .then((loaded) => {
        if (!cancelled) {
          setItems(loaded);
          setErrorMessage(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "加载云端数据失败",
          );
          setSyncState("error");
          setLoading(false);
        }
      });

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`items-household-${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (cancelled) return;

          if (payload.eventType === "INSERT") {
            const incoming = rowToItem(payload.new as ItemRow);
            setItems((current) => {
              if (current.some((item) => item.id === incoming.id)) {
                return current.map((item) =>
                  item.id === incoming.id ? incoming : item,
                );
              }
              return [incoming, ...current];
            });
            return;
          }

          if (payload.eventType === "UPDATE") {
            const updated = rowToItem(payload.new as ItemRow);
            setItems((current) => {
              if (current.some((item) => item.id === updated.id)) {
                return current.map((item) =>
                  item.id === updated.id ? updated : item,
                );
              }
              return [updated, ...current];
            });
            return;
          }

          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) {
              setItems((current) =>
                current.filter((item) => item.id !== oldRow.id),
              );
            }
          }
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setSyncState("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncState("error");
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

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

  const allRedItems = useMemo(
    () => items.filter((item) => item.status === "red"),
    [items],
  );
  const allYellowItems = useMemo(
    () => items.filter((item) => item.status === "yellow"),
    [items],
  );

  const showRestockBar =
    allRedItems.length > 0 || (includeYellow && allYellowItems.length > 0);

  const restockTargets = useMemo(() => {
    if (!includeYellow) return allRedItems;
    return [...allRedItems, ...allYellowItems];
  }, [allRedItems, allYellowItems, includeYellow]);

  const amazonCartPlan = useMemo(
    () => buildAmazonBatchCartUrl(restockTargets),
    [restockTargets],
  );

  async function handleCopyCode() {
    if (!householdId) return;
    try {
      await navigator.clipboard.writeText(householdId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setHouseholdSheetOpen(true);
    }
  }

  function handleSwitchHousehold(nextCode: string) {
    setHouseholdSheetOpen(false);
    setIncludeYellow(false);
    setErrorMessage(null);
    setSyncState("connecting");
    setItems([]);
    setLoading(true);
    saveHouseholdCode(nextCode);
  }

  async function cycleStatus(id: string) {
    if (!householdId) return;
    const target = items.find((item) => item.id === id);
    if (!target) return;

    const nextStatus = NEXT_STATUS[target.status];
    setErrorMessage(null);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item,
      ),
    );

    try {
      const updated = await updateHouseholdItem(householdId, id, {
        status: nextStatus,
      });
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
    } catch (error) {
      setItems((current) =>
        current.map((item) => (item.id === id ? target : item)),
      );
      setErrorMessage(
        error instanceof Error ? error.message : "更新状态失败",
      );
    }
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

  async function handleSaveItem(values: ItemFormValues) {
    if (!householdId) return;
    setErrorMessage(null);

    if (editingItem) {
      const previous = editingItem;
      setSheetOpen(false);
      setItems((current) =>
        current.map((item) =>
          item.id === previous.id
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

      try {
        const updated = await updateHouseholdItem(householdId, previous.id, {
          name: values.name,
          category: values.category,
          status: values.status,
          amazonAsin: values.amazonAsin,
          defaultQty: values.defaultQty,
        });
        setItems((current) =>
          current.map((item) => (item.id === previous.id ? updated : item)),
        );
      } catch (error) {
        setItems((current) =>
          current.map((item) => (item.id === previous.id ? previous : item)),
        );
        setErrorMessage(
          error instanceof Error ? error.message : "保存修改失败",
        );
      }
      return;
    }

    setSheetOpen(false);
    try {
      const created = await createHouseholdItem(householdId, values);
      setItems((current) => {
        if (current.some((item) => item.id === created.id)) {
          return current.map((item) =>
            item.id === created.id ? created : item,
          );
        }
        return [created, ...current];
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "新增物品失败",
      );
    }
  }

  async function handleDeleteItem(id: string) {
    if (!householdId) return;
    const previous = items;
    setSheetOpen(false);
    setErrorMessage(null);
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await deleteHouseholdItem(householdId, id);
    } catch (error) {
      setItems(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "删除物品失败",
      );
    }
  }

  async function handleMarkRestocked() {
    if (!householdId || restockTargets.length === 0 || markingBought) return;

    const targetIds = restockTargets.map((item) => item.id);
    const targetIdSet = new Set(targetIds);
    const nowIso = new Date().toISOString();
    const previousItems = items;

    setMarkingBought(true);
    setErrorMessage(null);
    setItems((current) =>
      current.map((item) =>
        targetIdSet.has(item.id)
          ? { ...item, status: "green", lastRestockedAt: nowIso }
          : item,
      ),
    );

    try {
      const updatedRows = await markHouseholdItemsRestocked(
        householdId,
        targetIds,
        nowIso,
      );
      const updatedMap = new Map(updatedRows.map((row) => [row.id, row]));
      setItems((current) =>
        current.map((item) => updatedMap.get(item.id) ?? item),
      );
      setIncludeYellow(false);
    } catch (error) {
      setItems(previousItems);
      setErrorMessage(
        error instanceof Error ? error.message : "批量标记已买失败",
      );
    } finally {
      setMarkingBought(false);
    }
  }

  const syncDotClass =
    syncState === "live"
      ? "bg-emerald-500"
      : syncState === "error"
        ? "bg-rose-500"
        : "bg-amber-400 animate-pulse";

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900">
      <main
        className={`mx-auto flex w-full max-w-md flex-col px-4 pt-6 ${
          showRestockBar ? "pb-40" : "pb-10"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
            HOMESTOCK
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!householdId}
              title="点击复制家庭码"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <span
                className={`size-2 rounded-full ${syncDotClass}`}
                aria-hidden="true"
              />
              <span className="text-zinc-400">家庭码</span>
              <span className="font-mono font-semibold tracking-wider text-zinc-900">
                {householdId || "------"}
              </span>
              {copiedCode ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3 text-zinc-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setHouseholdSheetOpen(true)}
              aria-label="切换或分享家庭码"
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              <Users className="size-3.5" />
              <span>切换</span>
            </button>
          </div>
        </div>

        <header className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.7rem] font-semibold tracking-tight">
              家里还够不够
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              点右侧的灯切换状态，同家庭码设备实时同步。
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

        {errorMessage && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p className="leading-5">{errorMessage}</p>
            </div>
            {householdId && (
              <button
                type="button"
                onClick={() => refreshItems(householdId)}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 font-medium text-rose-700 shadow-xs hover:bg-rose-100"
              >
                <RefreshCw className="size-3" />
                重试
              </button>
            )}
          </div>
        )}

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
              <span
                className="size-2 rounded-full bg-rose-500"
                aria-hidden="true"
              />
              {statusCounts.red}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full bg-amber-400"
                aria-hidden="true"
              />
              {statusCounts.yellow}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {statusCounts.green}
            </span>
          </div>
        </div>

        {loading ? (
          <ul className="mt-3 flex flex-col gap-3" aria-label="正在加载">
            {[0, 1, 2, 3].map((slot) => (
              <li
                key={slot}
                className="flex items-center justify-between rounded-3xl bg-white px-4 py-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-200" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-zinc-100" />
                </div>
                <div className="mr-3 size-8 animate-pulse rounded-full bg-zinc-200" />
              </li>
            ))}
          </ul>
        ) : visibleItems.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(24,24,27,0.04),0_10px_24px_rgba(24,24,27,0.05)]">
            <p className="text-sm font-medium text-zinc-600">
              {items.length === 0
                ? "还没有记录任何日用品"
                : "当前分类下还没有物品"}
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

      {showRestockBar && (
        <RestockBar
          targetCount={restockTargets.length}
          yellowCount={allYellowItems.length}
          includeYellow={includeYellow}
          onToggleIncludeYellow={setIncludeYellow}
          cartPlan={amazonCartPlan}
          markingBought={markingBought}
          onMarkBought={handleMarkRestocked}
        />
      )}

      {sheetOpen && (
        <ItemSheet
          key={editingItem?.id ?? "new"}
          editingItem={editingItem}
          onClose={closeSheet}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
        />
      )}

      {householdSheetOpen && householdId && (
        <HouseholdSheet
          currentCode={householdId}
          onClose={() => setHouseholdSheetOpen(false)}
          onSwitchCode={handleSwitchHousehold}
        />
      )}
    </div>
  );
}
