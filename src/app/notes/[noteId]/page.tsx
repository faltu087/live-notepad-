"use client";

import dynamic from "next/dynamic";
import { use } from "react";

// Dynamically import the editor with SSR disabled as Monaco requires browser APIs
const CollabEditor = dynamic(() => import("@/components/CollabEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#0D1117]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-teal-500/30 rounded-full animate-spin border-t-teal-400" />
        <span className="text-sm text-zinc-500 font-mono">Loading editor...</span>
      </div>
    </div>
  ),
});

type NotePageProps = {
  params: Promise<{
    noteId: string;
  }>;
};

export default function NotePage({ params }: NotePageProps) {
  const { noteId } = use(params);

  return <CollabEditor noteId={noteId} />;
}
