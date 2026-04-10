"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useCollaboration } from "@/hooks/use-collaboration";
import { DEFAULT_LANGUAGE, Language, getLanguageById } from "@/lib/languages";
import EditorHeader from "./EditorHeader";
import FloatingActionBar from "./FloatingActionBar";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CollabEditorProps {
  noteId: string;
}

export default function CollabEditor({ noteId }: CollabEditorProps) {
  const { collab, connectedUsers, isConnected } = useCollaboration(noteId);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [actionBarVisible, setActionBarVisible] = useState(false);
  const [actionBarPosition, setActionBarPosition] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const decorationsRef = useRef<any[]>([]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch persisted language
  useEffect(() => {
    const fetchLanguage = async () => {
      const docSnap = await getDoc(doc(db, "notes", noteId));
      if (docSnap.exists() && docSnap.data().languageId) {
        setLanguage(getLanguageById(docSnap.data().languageId));
      }
    };
    fetchLanguage();
  }, [noteId]);

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

  // Handle remote cursor decorations
  useEffect(() => {
    if (!collab || !editorRef.current || !isEditorReady) return;

    const editor = editorRef.current;
    
    const updateDecorations = () => {
      const states = collab.awareness.getStates();
      const newDecorations: any[] = [];
      const monaco = (window as any).monaco;

      states.forEach((state, clientId) => {
        if (clientId.toString() === collab.ydoc.clientID.toString()) return;
        if (!state.cursor || !state.cursor.anchor) return;

        // Custom style for the remote cursor
        const color = state.color || "#4ECDC4";
        const name = state.name || "User";

        // Add CSS variable for color if needed, but for simplicity we rely on globals.css for now
        // y-monaco already uses `yRemoteSelectionHead` which we styled.
        // Doing it manually to match Yjs exactly:
        newDecorations.push({
          range: new monaco.Range(
            state.cursor.anchor.lineNumber,
            state.cursor.anchor.column,
            state.cursor.anchor.lineNumber,
            state.cursor.anchor.column
          ),
          options: {
            className: "yRemoteSelection",
            hoverMessage: { value: name },
            beforeContentClassName: "yRemoteSelectionHead",
          },
        });
        
        // If there's a selection range
        if (state.cursor.selection && state.cursor.selection.startLineNumber) {
           newDecorations.push({
             range: new monaco.Range(
               state.cursor.selection.startLineNumber,
               state.cursor.selection.startColumn,
               state.cursor.selection.endLineNumber,
               state.cursor.selection.endColumn
             ),
             options: {
               className: "yRemoteSelection text-opacity-30",
             }
           });
        }
      });

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    };

    collab.awareness.on("change", updateDecorations);
    return () => {
      collab.awareness.off("change", updateDecorations);
    };
  }, [collab, isEditorReady]);

  // Handle local cursor changes to broadcast to awareness
  useEffect(() => {
    if (!collab || !editorRef.current || !isEditorReady) return;
    const editor = editorRef.current;

    const disposable = editor.onDidChangeCursorPosition((e: any) => {
      collab.awareness.setLocalStateField("cursor", {
        anchor: e.position,
        selection: editor.getSelection(),
      });
    });

    const selectionDisposable = editor.onDidChangeCursorSelection((e: any) => {
      const selection = e.selection;
      const isNotEmpty = !selection.isEmpty();

      if (isNotEmpty) {
        // Calculate position (slightly above the selection)
        const coords = editor.getScrolledVisiblePosition(selection.getStartPosition());
        if (coords) {
          const editorElement = editor.getDomNode();
          const rect = editorElement.getBoundingClientRect();
          setActionBarPosition({
            top: rect.top + coords.top,
            left: rect.left + coords.left,
          });
          setActionBarVisible(true);
        }
      } else {
        setActionBarVisible(false);
      }
    });

    return () => {
      disposable.dispose();
      selectionDisposable.dispose();
    };
  }, [collab, isEditorReady, isMobile]);

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
      
      // Persist to Firestore
      setDoc(doc(db, "notes", noteId), { languageId: newLang.id }, { merge: true })
        .catch(err => console.error("Could not save language", err));
    }
  }, [noteId]);

  const handleSelectAll = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        editor.setSelection(model.getFullModelRange());
        editor.focus();
        
        // On mobile, keep the bar visible after select all
        if (isMobile) {
          const coords = editor.getScrolledVisiblePosition(model.getFullModelRange().getStartPosition());
          const rect = editor.getDomNode().getBoundingClientRect();
          setActionBarPosition({ top: rect.top + coords.top, left: rect.left + coords.left });
          setActionBarVisible(true);
        }
      }
    }
  }, [isMobile]);

  const handleCut = async () => {
    const editor = editorRef.current;
    if (editor) {
      const text = editor.getModel().getValueInRange(editor.getSelection());
      await navigator.clipboard.writeText(text);
      editor.executeEdits("mobile-cut", [{
        range: editor.getSelection(),
        text: "",
        forceMoveMarkers: true
      }]);
      setActionBarVisible(false);
    }
  };

  const handleCopy = async () => {
    const editor = editorRef.current;
    if (editor) {
      const text = editor.getModel().getValueInRange(editor.getSelection());
      await navigator.clipboard.writeText(text);
      setActionBarVisible(false);
    }
  };

  const handlePaste = async () => {
    const editor = editorRef.current;
    if (editor) {
      try {
        const text = await navigator.clipboard.readText();
        editor.executeEdits("mobile-paste", [{
          range: editor.getSelection(),
          text: text,
          forceMoveMarkers: true
        }]);
        setActionBarVisible(false);
      } catch (err) {
        alert("Please allow clipboard access to paste.");
      }
    }
  };

  const handleShare = async () => {
    const editor = editorRef.current;
    if (editor) {
      const text = editor.getModel().getValueInRange(editor.getSelection()) || editor.getValue();
      if (navigator.share) {
        navigator.share({
          title: "SyncNote Snippet",
          text: text,
          url: window.location.href
        }).catch(() => {});
      } else {
        alert("Sharing not supported on this browser.");
      }
    }
  };

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
        onSelectAll={handleSelectAll}
      />

      <FloatingActionBar
        isVisible={actionBarVisible}
        position={actionBarPosition}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onShare={handleShare}
        onSelectAll={handleSelectAll}
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
            fontSize: isMobile ? 16 : 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 16, bottom: 16 },
            minimap: {
              enabled: !isMobile,
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
            contextmenu: false,
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
