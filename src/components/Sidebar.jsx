import Avatar from './Avatar';

export default function Sidebar({
  roomId, roomName, participants, currentUser,
  shareLink, onCopyLink, copied, onLeave,
}) {
  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-room-name">
          <span>❄️</span>
          {roomName || roomId}
        </div>
        <div className="sidebar-room-id"># {roomId}</div>
      </div>

      {/* Participants */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-section-title">
          <span>👥</span>
          Members
          <span className="count-badge">{participants.length}</span>
        </div>
        <div className="participants-list">
          {participants.map(p => (
            <div key={p.username} className="participant-item">
              <Avatar username={p.username} color={p.avatarColor} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="participant-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.username}
                </div>
                {p.username === currentUser.username && (
                  <div className="participant-you">you</div>
                )}
              </div>
              <div className="pulse-dot" />
            </div>
          ))}
          {participants.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 0' }}>
              No one here yet…
            </p>
          )}
        </div>
      </div>

      {/* Footer — share link + leave */}
      <div className="sidebar-footer">
        <div className="sidebar-section-title" style={{ padding: 0 }}>
          <span>🔗</span>
          Share Room
        </div>
        <div
          id="copy-link-btn"
          className="share-link-box"
          onClick={onCopyLink}
          title="Click to copy share link"
        >
          <span className="share-link-text">
            {copied ? '✓ Copied!' : shareLink}
          </span>
          <span className="copy-icon">
            {copied ? '✓' : '⎘'}
          </span>
        </div>

        <button
          id="sidebar-leave-btn"
          className="btn btn-danger"
          onClick={onLeave}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ⬡ Leave Room
        </button>
      </div>
    </div>
  );
}
