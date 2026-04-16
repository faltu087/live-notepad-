"use client";

import { LANGUAGES, Language } from "@/lib/languages";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredLanguages = LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-sm text-zinc-300 hover:text-white transition-all duration-200"
      >
        <span className="font-medium">{selectedLanguage.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-56 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search */}
          <div className="p-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800 rounded-md">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 flex-1 outline-none"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
            {filteredLanguages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  onLanguageChange(lang);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 flex items-center justify-between ${selectedLanguage.id === lang.id
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
              >
                <span>{lang.name}</span>
                {lang.extension && (
                  <span className="text-xs text-zinc-500">{lang.extension}</span>
                )}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                No language found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
