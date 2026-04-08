import NoteEditor from '@/components/NoteEditor';

type NotePageProps = {
  params: {
    noteId: string;
  };
};

export default function NotePage({ params }: NotePageProps) {
  return <NoteEditor noteId={params.noteId} />;
}
