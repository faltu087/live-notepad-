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

    // Track connected users via custom awareness object
    const updateUsers = () => {
      const states = collaboration.awareness.getStates();
      const users: ConnectedUser[] = [];

      // Add self
      users.push({
        clientId: collaboration.awareness.clientID as any,
        name: collaboration.userName,
        color: collaboration.userColor,
      });

      // Add remote users
      states.forEach((state: any, clientId: any) => {
        if (state.name) {
          users.push({
            clientId: clientId as any,
            name: state.name,
            color: state.color,
          });
        }
      });

      setConnectedUsers(users);
    };

    collaboration.awareness.on("change", updateUsers);

    // In this Firestore-based sync, we consider it "connected" once initialized
    setIsConnected(true);
    updateUsers();

    return () => {
      collaboration.awareness.off("change", updateUsers);
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
