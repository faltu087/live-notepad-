"use client";

import React from "react";
import { Scissors, Copy, Share2, Clipboard, Type } from "lucide-react";

interface FloatingActionBarProps {
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onShare: () => void;
  onSelectAll: () => void;
  isVisible: boolean;
  position: { top: number; left: number } | null;
}

export default function FloatingActionBar({
  onCut,
  onCopy,
  onPaste,
  onShare,
  onSelectAll,
  isVisible,
  position,
}: MobileActionBarProps) {
  if (!isVisible || !position) return null;

  return (
    <div
      className="fixed z-[9999] flex items-center bg-[#2d2d2d] border border-zinc-700/50 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150"
      style={{
        top: `${position.top - 50}px`,
        left: `${Math.max(10, Math.min(position.left - 100, window.innerWidth - 300))}px`,
      }}
    >
      <button
        onClick={onCut}
        className="flex flex-col items-center justify-center p-2 min-w-[56px] hover:bg-zinc-700 transition-colors border-r border-zinc-700/50"
      >
        <Scissors className="w-4 h-4 text-zinc-300" />
        <span className="text-[10px] text-zinc-400 mt-0.5">Cut</span>
      </button>

      <button
        onClick={onCopy}
        className="flex flex-col items-center justify-center p-2 min-w-[56px] hover:bg-zinc-700 transition-colors border-r border-zinc-700/50"
      >
        <Copy className="w-4 h-4 text-zinc-300" />
        <span className="text-[10px] text-zinc-400 mt-0.5">Copy</span>
      </button>

      <button
        onClick={onPaste}
        className="flex flex-col items-center justify-center p-2 min-w-[56px] hover:bg-zinc-700 transition-colors border-r border-zinc-700/50"
      >
        <Clipboard className="w-4 h-4 text-zinc-300" />
        <span className="text-[10px] text-zinc-400 mt-0.5">Paste</span>
      </button>

      <button
        onClick={onShare}
        className="flex flex-col items-center justify-center p-2 min-w-[56px] hover:bg-zinc-700 transition-colors border-r border-zinc-700/50"
      >
        <Share2 className="w-4 h-4 text-zinc-300" />
        <span className="text-[10px] text-zinc-400 mt-0.5">Share</span>
      </button>

      <button
        onClick={onSelectAll}
        className="flex flex-col items-center justify-center p-2 min-w-[64px] hover:bg-zinc-700 transition-colors"
      >
        <Type className="w-4 h-4 text-zinc-300" />
        <span className="text-[10px] text-zinc-400 mt-0.5">Select All</span>
      </button>
    </div>
  );
}
