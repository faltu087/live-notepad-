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
  const clientId = ydoc.clientID.toString();

  // Firestore Real-time Sync Logic
  const noteRef = doc(db, "notes", noteId);
  const updatesRef = collection(db, "notes", noteId, "updates");
  const presenceRef = collection(db, "notes", noteId, "presence");

  // Presence state management
  const presenceStates = new Map<string, any>();
  const presenceListeners: Array<(states: Map<string, any>) => void> = [];

  const notifyPresenceListeners = () => {
    presenceListeners.forEach(listener => listener(presenceStates));
  };

  // Listen to remote presence updates
  const unsubscribePresence = onSnapshot(presenceRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data();
        if (change.doc.id !== clientId) {
          // Check if presence is older than 30 seconds (consider offline)
          if (Date.now() - data.lastActive > 30000) {
            presenceStates.delete(change.doc.id);
          } else {
            presenceStates.set(change.doc.id, data);
          }
        }
      } else if (change.type === "removed") {
        presenceStates.delete(change.doc.id);
      }
    });
    notifyPresenceListeners();
  });

  // Export a custom awareness object
  let presenceUpdateTimeout: NodeJS.Timeout | null = null;
  const awareness = {
    states: presenceStates,
    on: (event: string, callback: any) => {
      if (event === "change") presenceListeners.push(callback);
    },
    off: (event: string, callback: any) => {
      if (event === "change") {
        const index = presenceListeners.indexOf(callback);
        if (index > -1) presenceListeners.splice(index, 1);
      }
    },
    getStates: () => presenceStates,
    setLocalStateField: (field: string, value: any) => {
      // Throttle presence updates to Firestore (max 1 update per 300ms)
      if (field === "cursor" && presenceUpdateTimeout) return;

      const myPresenceRef = doc(db, "notes", noteId, "presence", clientId);
      
      const presenceData = {
        name: userName,
        color: userColor,
        [field]: value,
        lastActive: Date.now()
      };

      if (field === "cursor") {
        presenceUpdateTimeout = setTimeout(() => {
          setDoc(myPresenceRef, presenceData, { merge: true }).catch(console.error);
          presenceUpdateTimeout = null;
        }, 300);
      } else {
        setDoc(myPresenceRef, presenceData, { merge: true }).catch(console.error);
      }
    },
    clientID: ydoc.clientID
  };

  // Initial presence
  awareness.setLocalStateField("user", { name: userName, color: userColor });


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
          if (data.origin !== clientId) {
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
        origin: clientId,
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
      } catch (err) {
        console.warn("Snapshot failed", err);
      }
    }, 5000);
  };

  const destroy = () => {
    if (snapshotTimeout) clearTimeout(snapshotTimeout);
    if (presenceUpdateTimeout) clearTimeout(presenceUpdateTimeout);
    
    // Clean up local presence from Firestore
    deleteDoc(doc(db, "notes", noteId, "presence", clientId)).catch(console.error);

    unsubscribeFirestore();
    unsubscribePresence();
    ydoc.off("update", handleUpdate);
    indexeddbProvider.destroy();
    ydoc.destroy();
  };

  return {
    ydoc,
    yText,
    awareness,
    userName,
    userColor,
    destroy,
  };
}
