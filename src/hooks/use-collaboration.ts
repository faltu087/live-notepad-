"use client";

import { useState, useEffect, useRef } from "react";
import {
  createCollaboration,
  CollaborationState,
} from "@/lib/yjs-provider";

export interface ConnectedUser {
  clientId: number;
  name: string;
  color: string;
}

export function useCollaboration(noteId: string) {
  const [collab, setCollab] = useState<CollaborationState | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const collabRef = useRef<CollaborationState | null>(null);

  useEffect(() => {
    if (!noteId) return;

    const collaboration = createCollaboration(noteId);
    collabRef.current = collaboration;
    setCollab(collaboration);
    
    // In this Firestore-based sync, we consider it "connected" once initialized
    setIsConnected(true);

    // Initial user state (just yourself for now, since we simplified awareness)
    setConnectedUsers([{
      clientId: 0,
      name: collaboration.userName,
      color: collaboration.userColor
    }]);

    return () => {
      collaboration.destroy();
      collabRef.current = null;
    };
  }, [noteId]);

  return {
    collab,
    connectedUsers,
    isConnected,
  };
}
