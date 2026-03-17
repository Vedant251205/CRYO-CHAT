export default function NoteEditor({ note, onUpdate }) {
  if (!note) {
    return (
      <div className="editor-container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a collection or document to begin.</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <input
        className="editor-title"
        value={note.title}
        onChange={(e) => onUpdate({ ...note, title: e.target.value })}
        placeholder="Document Title"
        aria-label="Note Title"
      />
      <textarea
        className="editor-body"
        value={note.content}
        onChange={(e) => onUpdate({ ...note, content: e.target.value })}
        placeholder="Start typing..."
        aria-label="Note Content"
      />
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          LAST_SYNC: {new Date().toLocaleTimeString()}
        </span>
        <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
          Finalize
        </button>
      </div>
    </div>
  );
}
