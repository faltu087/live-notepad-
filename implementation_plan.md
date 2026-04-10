# 🚀 SyncNote Live → Rustpad-Style Collaborative Code Editor

Transform the current simple textarea notepad into a **Rustpad-like real-time collaborative code editor** with Monaco Editor, CRDT-based sync, multiple cursors, and a stunning dark UI.

## Current State
- Simple `<textarea>` with Firebase `onSnapshot` (last-write-wins, conflicts possible)
- No syntax highlighting, no multiple cursors, no user presence
- Basic UI with minimal styling

## Target State
- **Monaco Editor** (VS Code engine) with 100+ language syntax highlighting
- **Yjs CRDT** for conflict-free real-time collaboration
- **Multiple cursors** with user colors
- **User presence** indicators (who's connected)
- **Language selector** dropdown
- **Dark theme** premium UI inspired by Rustpad
- **Shareable URLs** (already exists)

---

## User Review Required

> [!IMPORTANT]
> **Architecture Decision:** We'll use **y-webrtc** for peer-to-peer sync between active users, and **Firebase Firestore** for persistence (saving/loading documents). This means:
> - Active users sync directly (P2P = fast, free)
> - Documents are saved to Firestore for persistence
> - No additional WebSocket server needed

> [!WARNING]
> **Firebase Firestore Rules:** You MUST update your Firestore security rules to allow read/write on the `notes` collection. Without this, nothing will work.

---

## Proposed Changes

### 1. New Dependencies

Install these packages:
```
@monaco-editor/react    → Monaco Editor for React
yjs                     → CRDT library for collaboration
y-webrtc                → Peer-to-peer sync provider
y-monaco                → Yjs ↔ Monaco binding
y-indexeddb             → Offline persistence in browser
```

---

### 2. Component Architecture

```
src/
├── app/
│   ├── page.tsx                    [MODIFY] → Redirect to /notes/[id]
│   ├── layout.tsx                  [MODIFY] → Dark theme, new fonts
│   ├── globals.css                 [MODIFY] → Complete dark theme redesign
│   └── notes/[noteId]/
│       └── page.tsx                [MODIFY] → Dynamic import editor
├── components/
│   ├── NoteEditor.tsx              [DELETE] → Replace with new editor
│   ├── CollabEditor.tsx            [NEW] → Main collaborative editor component
│   ├── LanguageSelector.tsx        [NEW] → Programming language dropdown
│   ├── UserPresence.tsx            [NEW] → Connected users avatars/colors
│   ├── EditorHeader.tsx            [NEW] → Top bar with controls
│   └── ui/                         [KEEP] → Existing shadcn components
├── lib/
│   ├── firebase.ts                 [KEEP] → Already configured
│   ├── yjs-provider.ts            [NEW] → Yjs + WebRTC + Firestore provider
│   └── languages.ts               [NEW] → Supported languages list
└── hooks/
    └── use-collaboration.ts        [NEW] → Custom hook for Yjs collaboration
```

---

### 3. Detailed File Changes

#### [NEW] `src/components/CollabEditor.tsx`
The main editor component:
- Monaco Editor with `vs-dark` theme
- Yjs document binding via `y-monaco`
- WebRTC provider for P2P sync
- Awareness protocol for cursor sharing
- Firestore persistence for document saving
- Random user color assignment
- Dynamic language switching

#### [NEW] `src/components/EditorHeader.tsx`
Top header bar (Rustpad-style):
- Logo + app name (left)
- Language selector dropdown (center)
- Connected users count + avatars (right)
- Share button with copy-link dialog
- "New Pad" button

#### [NEW] `src/components/LanguageSelector.tsx`
- Dropdown with 30+ programming languages
- Icons for popular languages
- Search/filter functionality
- Changes Monaco editor language on selection

#### [NEW] `src/components/UserPresence.tsx`
- Shows colored dots/avatars for each connected user
- Tooltip with user name/color
- Live count of active users

#### [NEW] `src/lib/yjs-provider.ts`
- Initializes Yjs document
- Sets up WebRTC provider with room name = noteId
- Configures awareness (cursor position, user info)
- Handles Firestore persistence (save/load Yjs state)

#### [NEW] `src/lib/languages.ts`
- Array of supported languages (JavaScript, Python, Rust, Go, etc.)
- Language ID ↔ Display name mapping

#### [NEW] `src/hooks/use-collaboration.ts`
- Custom React hook wrapping Yjs setup
- Returns: ydoc, provider, awareness, connected users
- Handles cleanup on unmount

#### [MODIFY] `src/app/globals.css`
- Complete dark theme (Rustpad-inspired)
- Dark background: `#1e1e1e` (VS Code dark)
- Accent colors: Teal/Cyan for branding
- Custom scrollbar styling
- Smooth animations

#### [MODIFY] `src/app/layout.tsx`
- Add `JetBrains Mono` font for code
- Dark mode by default
- Updated metadata

#### [MODIFY] `src/app/notes/[noteId]/page.tsx`
- Dynamic import of CollabEditor (`ssr: false`)
- Loading skeleton while editor loads

---

### 4. UI Design (Rustpad-Inspired)

```
┌─────────────────────────────────────────────────────────┐
│  📝 SyncNote Live    │ JavaScript ▾ │  👤👤👤 3 users  │  Share │ + New │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1 │ function hello() {                                │
│  2 │   console.log("Hello World! 🌍");                 │
│  3 │ }                                                 │
│  4 │                                                   │
│  5 │ // User2's cursor blinking here ▎                 │
│  6 │                                                   │
│    │                        (Monaco Editor - Dark)      │
│    │                                                    │
└─────────────────────────────────────────────────────────┘
```

- **Dark background** with VS Code dark theme
- **Line numbers** on the left
- **Multiple colored cursors** for each user
- **Minimap** on the right (optional)
- **Status bar** at bottom with language, cursor position

---

## Open Questions

> [!IMPORTANT]
> 1. **Firestore Rules** — Kya tumne Firestore rules update kiye hain? (`allow read, write: if true;`)
> 2. **Custom Domain** — Kya ye live deploy hoga ya sirf local testing ke liye hai?

---

## Verification Plan

### Automated Tests
1. `npm run dev` — Dev server starts without errors
2. Open in 2 browser tabs with same noteId URL
3. Type in Tab 1 → Text appears in Tab 2 (real-time)
4. Each tab shows different colored cursor
5. Language selector changes syntax highlighting
6. Refresh page → Content persists from Firestore

### Manual Verification
- Browser test: Open editor, type code, verify syntax highlighting
- Multi-tab test: Open 2 tabs, verify real-time cursor sync
- Share test: Copy link, open in incognito, verify collaboration
- Persistence test: Type, reload, verify content saved
