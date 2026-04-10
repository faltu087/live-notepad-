"use client";

import { Language } from "@/lib/languages";
import { ConnectedUser } from "@/hooks/use-collaboration";
import LanguageSelector from "./LanguageSelector";
import UserPresence from "./UserPresence";
import { Button } from "@/components/ui/button";
import { Share2, FilePlus2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditorHeaderProps {
  noteId: string;
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  connectedUsers: ConnectedUser[];
  currentUserName: string;
  isConnected: boolean;
}

export default function EditorHeader({
  noteId,
  selectedLanguage,
  onLanguageChange,
  connectedUsers,
  currentUserName,
  isConnected,
}: EditorHeaderProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-zinc-900/95 border-b border-zinc-800/80 backdrop-blur-sm shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-teal-400 to-cyan-500">
            <FilePlus2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden sm:inline font-mono tracking-tight">
            SyncNote
          </span>
        </Link>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-[11px] text-zinc-500 hidden md:inline">
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Center: Language Selector */}
      <div className="flex items-center">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Right: Users + Actions */}
      <div className="flex items-center gap-2">
        <UserPresence
          users={connectedUsers}
          currentUserName={currentUserName}
        />

        <div className="w-px h-5 bg-zinc-700/60 mx-1 hidden sm:block" />

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Share this pad</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Anyone with the link can view and edit this note in real-time.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="share-link" className="sr-only">
                  Link
                </Label>
                <Input
                  id="share-link"
                  defaultValue={url}
                  readOnly
                  className="bg-zinc-800 border-zinc-700 text-zinc-200"
                />
              </div>
              <Button
                size="sm"
                className="px-3 bg-teal-500 hover:bg-teal-600"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          asChild
          size="sm"
          className="h-8 text-xs bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30 gap-1.5"
        >
          <Link href="/">
            <FilePlus2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
