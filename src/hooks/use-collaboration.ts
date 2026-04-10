"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

    // Track connected users via awareness
    const updateUsers = () => {
      const states = collaboration.awareness.getStates();
      const users: ConnectedUser[] = [];

      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
          });
        }
      });

      setConnectedUsers(users);
      setIsConnected(true);
    };

    collaboration.awareness.on("change", updateUsers);
    collaboration.provider.on("synced", () => {
      setIsConnected(true);
      updateUsers();
    });

    // Initial update
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
