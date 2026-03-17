export default function NoteList({ notes, activeNoteId, onSelectNote }) {
  return (
    <div className="note-list" role="list" aria-label="Collections">
      {notes.map(note => (
        <button
          key={note.id}
          className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
          onClick={() => onSelectNote(note.id)}
          role="listitem"
          aria-current={activeNoteId === note.id ? 'true' : 'false'}
        >
          <span className="note-title">{note.title}</span>
          <span className="note-preview">{note.preview}</span>
        </button>
      ))}
    </div>
  );
}
