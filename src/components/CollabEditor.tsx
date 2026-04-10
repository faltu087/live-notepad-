"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useCollaboration } from "@/hooks/use-collaboration";
import { DEFAULT_LANGUAGE, Language, getLanguageById } from "@/lib/languages";
import EditorHeader from "./EditorHeader";

interface CollabEditorProps {
  noteId: string;
}

export default function CollabEditor({ noteId }: CollabEditorProps) {
  const { collab, connectedUsers, isConnected } = useCollaboration(noteId);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      setIsEditorReady(true);

      // Customize the editor theme for better cursor visibility
      monaco.editor.defineTheme("syncnote-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955" },
          { token: "keyword", foreground: "569CD6" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "type", foreground: "4EC9B0" },
        ],
        colors: {
          "editor.background": "#0D1117",
          "editor.foreground": "#E6EDF3",
          "editor.lineHighlightBackground": "#161B22",
          "editor.selectionBackground": "#264F78",
          "editorLineNumber.foreground": "#484F58",
          "editorLineNumber.activeForeground": "#E6EDF3",
          "editorCursor.foreground": "#58A6FF",
          "editor.selectionHighlightBackground": "#264F7833",
          "editorIndentGuide.background": "#21262D",
          "editorIndentGuide.activeBackground": "#30363D",
          "editorBracketMatch.background": "#264F7850",
          "editorBracketMatch.border": "#58A6FF",
          "scrollbar.shadow": "#00000000",
          "scrollbarSlider.background": "#484F5833",
          "scrollbarSlider.hoverBackground": "#484F5866",
          "scrollbarSlider.activeBackground": "#484F58AA",
          "editorWidget.background": "#161B22",
          "editorWidget.border": "#30363D",
          "minimap.background": "#0D1117",
        },
      });
      monaco.editor.setTheme("syncnote-dark");

      // Editor focus
      editor.focus();
    },
    []
  );

  // Bind Yjs to Monaco when both are ready
  useEffect(() => {
    if (!collab || !editorRef.current || !isEditorReady) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Clean up previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    // Create MonacoBinding - connects Yjs CRDT to Monaco Editor
    const binding = new MonacoBinding(
      collab.yText,
      model,
      new Set([editor]),
      collab.awareness
    );

    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [collab, isEditorReady]);

  const handleLanguageChange = useCallback((newLang: Language) => {
    setLanguage(newLang);
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Monaco has its own namespace for the editor
        const monaco = (window as any).monaco;
        if (monaco) {
          monaco.editor.setModelLanguage(model, newLang.id);
        }
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-zinc-200">
      {/* Header */}
      <EditorHeader
        noteId={noteId}
        selectedLanguage={language}
        onLanguageChange={handleLanguageChange}
        connectedUsers={connectedUsers}
        currentUserName={collab?.userName || ""}
        isConnected={isConnected}
      />

      {/* Editor */}
      <div className="flex-1 relative">
        {/* Loading overlay */}
        {!isEditorReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D1117] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-teal-500/30 rounded-full animate-spin border-t-teal-400" />
              </div>
              <span className="text-sm text-zinc-500 font-mono">
                Loading editor...
              </span>
            </div>
          </div>
        )}

        <Editor
          height="100%"
          defaultLanguage={language.id}
          language={language.id}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 16, bottom: 16 },
            minimap: {
              enabled: true,
              side: "right",
              size: "proportional",
              maxColumn: 80,
            },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            wordWrap: "off",
            tabSize: 2,
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            formatOnPaste: true,
          }}
          loading={null}
        />
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between h-6 px-3 bg-zinc-900/95 border-t border-zinc-800/50 text-[11px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected
                  ? "bg-emerald-400"
                  : "bg-yellow-400 animate-pulse"
              }`}
            />
            {isConnected ? "Synced" : "Syncing..."}
          </span>
          <span>
            {connectedUsers.length}{" "}
            {connectedUsers.length === 1 ? "user" : "users"} connected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>{language.name}</span>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </footer>
    </div>
  );
}
