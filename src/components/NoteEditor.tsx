"use client";

import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Share2, FilePlus2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteEditor({ noteId }: { noteId: string }) {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!noteId) return;

    const noteRef = doc(db, "notes", noteId);
    
    const unsubscribe = onSnapshot(noteRef, (docSnap) => {
      setIsLoading(false);
      if (docSnap.exists()) {
        const remoteText = docSnap.data().content;
        setText(currentText => {
            if (currentText !== remoteText) {
                return remoteText;
            }
            return currentText;
        });
      } else {
        setDoc(noteRef, { content: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }, (error) => {
        console.error("Firebase subscription error:", error);
        setIsLoading(false);
        toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Could not connect to the notepad service. Please check your Firebase setup.",
        });
    });

    return () => {
        unsubscribe();
        if (updateTimeout.current) {
            clearTimeout(updateTimeout.current);
        }
    };
  }, [noteId, toast]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    if (updateTimeout.current) clearTimeout(updateTimeout.current);

    updateTimeout.current = setTimeout(() => {
        const noteRef = doc(db, 'notes', noteId);
        setDoc(noteRef, { content: newText, updatedAt: serverTimestamp() }, { merge: true });
    }, 500);
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
            title: "Link Copied!",
            description: "You can now share this note with others.",
        });
    }).catch(() => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not copy link. Please copy it from the address bar.",
        });
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between h-16 px-4 border-b shrink-0 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline">
            <FilePlus2 className="w-5 h-5 text-primary" />
            <span>SyncNote Live</span>
        </Link>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
            </Button>
            <Button asChild variant="default" size="sm">
                <Link href="/">
                    <FilePlus2 className="w-4 h-4 mr-2" />
                    New Note
                </Link>
            </Button>
        </div>
      </header>

      <main className="flex flex-col flex-1 w-full max-w-5xl p-4 mx-auto md:p-6">
        {isLoading ? (
            <div className="w-full h-full p-6 space-y-4 bg-white border rounded-lg shadow-sm border-border">
                <Skeleton className="w-1/4 h-8" />
                <Skeleton className="w-full h-64" />
            </div>
        ) : (
            <Textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Start typing your collaborative notes here... Any changes will be saved and synced live."
                className="w-full h-full p-6 text-base leading-relaxed resize-none bg-white border-border rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Live Notepad"
            />
        )}
      </main>
    </div>
  );
}
