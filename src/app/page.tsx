import { redirect } from 'next/navigation';

export default function Home() {
  // Generate a short, URL-friendly, unique-enough ID for the new note.
  // This works in both Node.js and Edge runtimes.
  const array = new Uint8Array(5);
  crypto.getRandomValues(array);
  const noteId = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

  redirect(`/notes/${noteId}`);
}
