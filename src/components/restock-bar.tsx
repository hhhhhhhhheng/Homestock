"use client";

import { CheckCheck, ExternalLink, ShoppingCart } from "lucide-react";
import type { AmazonCartPlan } from "@/lib/amazon";

type RestockBarProps = {
  targetCount: number;
  yellowCount: number;
  includeYellow: boolean;
  onToggleIncludeYellow: (next: boolean) => void;
  cartPlan: AmazonCartPlan;
  markingBought: boolean;
  onMarkBought: () => void;
};

export function RestockBar({
  targetCount,
  yellowCount,
  includeYellow,
  onToggleIncludeYellow,
  cartPlan,
  markingBought,
  onMarkBought,
}: RestockBarProps) {
  const hasAmazonItems = Boolean(cartPlan.url && cartPlan.boundItems.length > 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white/95 p-3.5 shadow-[0_12px_36px_rgba(24,24,27,0.14)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <ShoppingCart className="size-3.5" />
            </span>
            <p className="truncate text-sm font-semibold text-zinc-900">
              待买 {targetCount} 件
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeYellow}
            onClick={() => onToggleIncludeYellow(!includeYellow)}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <span>
              同时包含黄灯{yellowCount > 0 ? ` (${yellowCount})` : ""}
            </span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                includeYellow ? "bg-amber-400" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  includeYellow ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {hasAmazonItems ? (
              <a
                href={cartPlan.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] hover:bg-zinc-800"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span className="truncate">
                  一键加购 Amazon ({cartPlan.boundItems.length})
                </span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-2xl bg-zinc-200 px-3 text-sm font-semibold text-zinc-500"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span className="truncate">一键加购 Amazon</span>
              </button>
            )}

            {cartPlan.unboundCount > 0 && (
              <p className="px-1 text-[11px] leading-none text-zinc-500">
                有 {cartPlan.unboundCount} 件待买物品未绑定 Amazon 链接
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onMarkBought}
            disabled={markingBought}
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="size-4 shrink-0" />
            <span>{markingBought ? "更新中..." : "一键标记已买"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
