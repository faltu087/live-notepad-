"use client";

import { ConnectedUser } from "@/hooks/use-collaboration";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserPresenceProps {
  users: ConnectedUser[];
  currentUserName: string;
}

export default function UserPresence({ users, currentUserName }: UserPresenceProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-400 mr-1 hidden sm:inline">
          {users.length} {users.length === 1 ? "user" : "users"}
        </span>
        <div className="flex -space-x-1.5">
          {users.map((user) => (
            <Tooltip key={user.clientId}>
              <TooltipTrigger asChild>
                <div
                  className="relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-zinc-800 text-[10px] font-bold uppercase cursor-default transition-transform hover:scale-110 hover:z-10"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                  {/* Pulse animation for current user */}
                  {user.name === currentUserName && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: user.color }}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs"
              >
                {user.name}
                {user.name === currentUserName && " (you)"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
