import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// User colors for cursors
const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
  "#F1948A", "#AED6F1", "#D7BDE2", "#A3E4D7",
];

const ANIMAL_NAMES = [
  "Fox", "Owl", "Cat", "Wolf", "Bear", "Hawk",
  "Deer", "Lion", "Lynx", "Puma", "Crow", "Dove",
  "Swan", "Kite", "Seal", "Hare",
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getRandomName(): string {
  const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${animal}${num}`;
}

export interface CollaborationState {
  ydoc: Y.Doc;
  provider: WebrtcProvider;
  yText: Y.Text;
  awareness: WebrtcProvider["awareness"];
  userName: string;
  userColor: string;
  destroy: () => void;
}

export function createCollaboration(noteId: string): CollaborationState {
  const ydoc = new Y.Doc();
  const yText = ydoc.getText("monaco");

  // WebRTC provider for peer-to-peer sync
  const provider = new WebrtcProvider(`syncnote-${noteId}`, ydoc, {
    signaling: [
      "wss://signaling.yjs.dev",
      "wss://y-webrtc-signaling-eu.herokuapp.com",
      "wss://y-webrtc-signaling-us.herokuapp.com",
    ],
  });

  // IndexedDB for local offline persistence
  const indexeddbProvider = new IndexeddbPersistence(`syncnote-${noteId}`, ydoc);

  // Set user awareness (name, color, cursor)
  const userName = getRandomName();
  const userColor = getRandomColor();

  provider.awareness.setLocalStateField("user", {
    name: userName,
    color: userColor,
    colorLight: userColor + "40",
  });

  // Firebase Firestore persistence - load initial state
  loadFromFirestore(noteId, ydoc);

  // Save to Firestore periodically (debounced)
  let saveTimeout: NodeJS.Timeout | null = null;
  const handleUpdate = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToFirestore(noteId, ydoc);
    }, 2000);
  };

  ydoc.on("update", handleUpdate);

  const destroy = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    // Save before leaving
    saveToFirestore(noteId, ydoc);
    ydoc.off("update", handleUpdate);
    provider.destroy();
    indexeddbProvider.destroy();
    ydoc.destroy();
  };

  return {
    ydoc,
    provider,
    yText,
    awareness: provider.awareness,
    userName,
    userColor,
    destroy,
  };
}

async function saveToFirestore(noteId: string, ydoc: Y.Doc) {
  try {
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64State = btoa(
      String.fromCharCode(...new Uint8Array(state))
    );
    const noteRef = doc(db, "notes", noteId);
    await setDoc(
      noteRef,
      {
        yjsState: base64State,
        updatedAt: new Date().toISOString(),
        textPreview: ydoc.getText("monaco").toString().substring(0, 200),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Failed to save to Firestore:", error);
  }
}

async function loadFromFirestore(noteId: string, ydoc: Y.Doc) {
  try {
    const noteRef = doc(db, "notes", noteId);
    const docSnap = await getDoc(noteRef);

    if (docSnap.exists() && docSnap.data().yjsState) {
      const base64State = docSnap.data().yjsState;
      const binaryString = atob(base64State);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      Y.applyUpdate(ydoc, bytes);
    }
  } catch (error) {
    console.warn("Failed to load from Firestore:", error);
  }
}
