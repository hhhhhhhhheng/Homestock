"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Minus, Plus, Trash2, X } from "lucide-react";
import { extractAsin, isValidAsin } from "@/lib/asin";
import type { Category, Item, ItemStatus } from "@/types/item";

export type ItemFormValues = {
  name: string;
  category: Category;
  status: ItemStatus;
  amazonAsin?: string;
  defaultQty: number;
};

type ItemSheetProps = {
  editingItem: Item | null;
  onClose: () => void;
  onSave: (values: ItemFormValues) => void;
  onDelete?: (id: string) => void;
};

const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: "bathroom", label: "厨卫" },
  { id: "kitchen", label: "饮食" },
  { id: "pet", label: "宠物" },
  { id: "other", label: "其他" },
];

const STATUS_OPTIONS: {
  id: ItemStatus;
  label: string;
  dotClass: string;
  activeClass: string;
}[] = [
  {
    id: "green",
    label: "充足",
    dotClass: "bg-emerald-500",
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    id: "yellow",
    label: "快没了",
    dotClass: "bg-amber-400",
    activeClass: "border-amber-400 bg-amber-50 text-amber-700",
  },
  {
    id: "red",
    label: "立刻买",
    dotClass: "bg-rose-500",
    activeClass: "border-rose-500 bg-rose-50 text-rose-700",
  },
];

export function ItemSheet({
  editingItem,
  onClose,
  onSave,
  onDelete,
}: ItemSheetProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [category, setCategory] = useState<Category>(
    editingItem?.category ?? "bathroom",
  );
  const [status, setStatus] = useState<ItemStatus>(
    editingItem?.status ?? "green",
  );
  const [asinInput, setAsinInput] = useState(editingItem?.amazonAsin ?? "");
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);
  const [defaultQty, setDefaultQty] = useState(editingItem?.defaultQty ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleAsinChange(rawValue: string) {
    setError(null);
    const { asin, fromUrl } = extractAsin(rawValue);
    if (fromUrl && asin) {
      setAsinInput(asin);
      setExtractedNotice(`已自动提取 ASIN：${asin}`);
      return;
    }

    setAsinInput(rawValue);
    setExtractedNotice(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入物品名称");
      return;
    }

    const trimmedAsin = asinInput.trim();
    let normalizedAsin: string | undefined;
    if (trimmedAsin) {
      const { asin } = extractAsin(trimmedAsin);
      if (!asin || !isValidAsin(asin)) {
        setError("请输入有效的 10 位 ASIN 码，或粘贴完整 Amazon 商品链接");
        return;
      }
      normalizedAsin = asin;
    }

    onSave({
      name: trimmedName,
      category,
      status,
      amazonAsin: normalizedAsin,
      defaultQty: Math.max(1, Math.min(99, defaultQty)),
    });
  }

  const trimmedAsin = asinInput.trim();
  const asinValid = trimmedAsin.length > 0 && isValidAsin(trimmedAsin);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-sheet-title"
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-6 pt-3 shadow-2xl sm:rounded-3xl sm:pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-200 sm:hidden"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between">
          <h2 id="item-sheet-title" className="text-lg font-semibold text-zinc-900">
            {editingItem ? "编辑物品" : "新增物品"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="item-name"
              className="block text-xs font-medium text-zinc-500"
            >
              物品名称
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="例如：维达抽纸、狗粮"
              autoFocus={!editingItem}
              className="mt-1.5 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-500">
              所属分类
            </span>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const selected = category === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCategory(option.id)}
                    className={`h-10 cursor-pointer rounded-2xl border text-sm font-medium transition-colors ${
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-500">
              {editingItem ? "当前状态" : "初始状态"}
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((option) => {
                const selected = status === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatus(option.id)}
                    className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                      selected
                        ? option.activeClass
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`size-2.5 rounded-full ${option.dotClass}`}
                      aria-hidden="true"
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label
                htmlFor="item-asin"
                className="block text-xs font-medium text-zinc-500"
              >
                Amazon 链接或 ASIN（可选）
              </label>
              <div className="relative mt-1.5">
                <input
                  id="item-asin"
                  type="text"
                  value={asinInput}
                  onChange={(event) => handleAsinChange(event.target.value)}
                  placeholder="粘贴链接或 10 位 ASIN"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
                />
                {asinInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAsinInput("");
                      setExtractedNotice(null);
                      setError(null);
                    }}
                    aria-label="清空 ASIN"
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              {extractedNotice && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  {extractedNotice}
                </p>
              )}
              {!extractedNotice && asinValid && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  ASIN：{trimmedAsin.toUpperCase()}
                </p>
              )}
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-500">
                补货数量
              </span>
              <div className="mt-1.5 flex h-11 items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-1">
                <button
                  type="button"
                  onClick={() => setDefaultQty((qty) => Math.max(1, qty - 1))}
                  aria-label="减少数量"
                  disabled={defaultQty <= 1}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums text-zinc-900">
                  {defaultQty}
                </span>
                <button
                  type="button"
                  onClick={() => setDefaultQty((qty) => Math.min(99, qty + 1))}
                  aria-label="增加数量"
                  className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-white"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-1 flex flex-col gap-2">
            <button
              type="submit"
              className="h-12 w-full cursor-pointer rounded-2xl bg-zinc-900 text-sm font-semibold text-white transition-transform active:scale-[0.99] hover:bg-zinc-800"
            >
              {editingItem ? "保存修改" : "添加到看板"}
            </button>

            {editingItem && onDelete && (
              confirmingDelete ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="h-11 cursor-pointer rounded-2xl border border-zinc-200 bg-white text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(editingItem.id)}
                    className="h-11 cursor-pointer rounded-2xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    确认删除
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                  删除物品
                </button>
              )
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
