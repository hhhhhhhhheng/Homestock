"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Users, X } from "lucide-react";
import {
  generateHouseholdCode,
  isValidHouseholdCode,
  normalizeHouseholdCode,
} from "@/lib/household";

type HouseholdSheetProps = {
  currentCode: string;
  onClose: () => void;
  onSwitchCode: (nextCode: string) => void;
};

export function HouseholdSheet({
  currentCode,
  onClose,
  onSwitchCode,
}: HouseholdSheetProps) {
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopyCurrent() {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("复制失败，请手动长按家庭码复制");
    }
  }

  function handleJoinSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeHouseholdCode(inputCode);
    if (!isValidHouseholdCode(normalized)) {
      setError("请输入 6 位大写字母或数字组成的家庭码");
      return;
    }
    if (normalized === currentCode) {
      onClose();
      return;
    }
    onSwitchCode(normalized);
  }

  function handleCreateNew() {
    let nextCode = generateHouseholdCode();
    if (nextCode === currentCode) {
      nextCode = generateHouseholdCode();
    }
    onSwitchCode(nextCode);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="household-sheet-title"
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
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <Users className="size-4" />
            </span>
            <h2
              id="household-sheet-title"
              className="text-lg font-semibold text-zinc-900"
            >
              家庭实时同步码
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭家庭码弹窗"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          免注册即可同步：把下方家庭码发给同住家人，或输入家人的 6 位家庭码加入同一个补货板。
        </p>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">当前家庭码</p>
            <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.18em] text-zinc-900">
              {currentCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCurrent}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                复制分享
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleJoinSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label
              htmlFor="household-code-input"
              className="block text-xs font-medium text-zinc-500"
            >
              加入已有家庭（输入 6 位家庭码）
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="household-code-input"
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(event) => {
                  setInputCode(normalizeHouseholdCode(event.target.value));
                  if (error) setError(null);
                }}
                placeholder="例如 HOME88"
                autoCapitalize="characters"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 font-mono text-base font-semibold tracking-[0.16em] text-zinc-900 placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 shrink-0 cursor-pointer rounded-2xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                切换加入
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </form>

        <div className="mt-4 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <RefreshCw className="size-3.5" />
            生成一个新的随机家庭码（自动带 6 条示例）
          </button>
        </div>
      </div>
    </div>
  );
}
