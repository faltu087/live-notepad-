import * as Y from "yjs";
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { IndexeddbPersistence } from "y-indexeddb";

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
  yText: Y.Text;
  awareness: any;
  userName: string;
  userColor: string;
  destroy: () => void;
}

// Helper to convert Uint8Array to Base64
const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
// Helper to convert Base64 to Uint8Array
const fromBase64 = (str: string) => {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export function createCollaboration(noteId: string): CollaborationState {
  const ydoc = new Y.Doc();
  const yText = ydoc.getText("monaco");

  // Local persistence
  const indexeddbProvider = new IndexeddbPersistence(`syncnote-${noteId}`, ydoc);

  // Awareness (Cursors) - Fallback to simple local state for now
  // In a full implementation, awareness updates would also sync to Firestore
  const awareness = {
    states: new Map(),
    on: () => {},
    off: () => {},
    getStates: () => new Map(),
    setLocalStateField: () => {},
  };

  const userName = getRandomName();
  const userColor = getRandomColor();

  // Firestore Real-time Sync Logic
  const noteRef = doc(db, "notes", noteId);
  const updatesRef = collection(db, "notes", noteId, "updates");

  // 1. Initial Load from Firestore (Main Document)
  const initialLoad = async () => {
    const docSnap = await getDoc(noteRef);
    if (docSnap.exists() && docSnap.data().yjsState) {
      Y.applyUpdate(ydoc, fromBase64(docSnap.data().yjsState), "initial");
    }
  };
  initialLoad();

  // 2. Listen for incoming updates from other users
  const unsubscribeFirestore = onSnapshot(
    query(updatesRef, orderBy("timestamp", "asc")),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Don't apply our own updates (tagged with our clientId or origin)
          if (data.origin !== ydoc.clientID.toString()) {
            try {
              Y.applyUpdate(ydoc, fromBase64(data.update), "firestore");
            } catch (e) {
              console.error("Failed to apply Firestore update", e);
            }
          }
        }
      });
    }
  );

  // 3. Send local updates to Firestore
  const handleUpdate = (update: Uint8Array, origin: any) => {
    // Only send updates that didn't come from Firestore itself
    if (origin !== "firestore" && origin !== "initial") {
      addDoc(updatesRef, {
        update: toBase64(update),
        origin: ydoc.clientID.toString(),
        timestamp: serverTimestamp(),
      }).catch(err => console.error("Error sending update to Firestore", err));
    }

    // Debounce saving the full state to the main document (Snapshotting)
    debouncedSnapshot(noteId, ydoc);
  };

  ydoc.on("update", handleUpdate);

  // Snapshotting logic to keep the updates collection clean
  let snapshotTimeout: NodeJS.Timeout | null = null;
  const debouncedSnapshot = (id: string, doc: Y.Doc) => {
    if (snapshotTimeout) clearTimeout(snapshotTimeout);
    snapshotTimeout = setTimeout(async () => {
      try {
        const state = Y.encodeStateAsUpdate(doc);
        await setDoc(noteRef, {
          yjsState: toBase64(state),
          updatedAt: serverTimestamp(),
          textPreview: doc.getText("monaco").toString().substring(0, 200),
        }, { merge: true });

        // Optional: Clean up old updates to keep DB small and fast
        // (In a real app, you'd do this via a Cloud Function)
      } catch (err) {
        console.warn("Snapshot failed", err);
      }
    }, 5000);
  };

  const destroy = () => {
    if (snapshotTimeout) clearTimeout(snapshotTimeout);
    unsubscribeFirestore();
    ydoc.off("update", handleUpdate);
    indexeddbProvider.destroy();
    ydoc.destroy();
  };

  return {
    ydoc,
    yText,
    awareness, // Note: Shared cursors need more logic for Firestore, keeping placeholder
    userName,
    userColor,
    destroy,
  };
}
