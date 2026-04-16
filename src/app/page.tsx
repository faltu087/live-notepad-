import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Generate a short, URL-friendly, unique-enough ID for the new note.
  // Using Math.random() as a fallback for standard URL uniqueness without crypto compatibility issues in Next.js caching
  const noteId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);

  redirect(`/notes/${noteId}`);
}
