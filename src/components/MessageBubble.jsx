import Avatar from './Avatar';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ msg, isOwn, showAvatar, dataId }) {
  if (msg.type === 'system') {
    return (
      <div className="message-system msg-enter">
        {msg.text}
      </div>
    );
  }

  return (
    <div className={`message-group ${isOwn ? 'own' : ''} msg-enter`}>
      {showAvatar ? (
        <Avatar username={msg.username} color={msg.avatarColor} size="sm" />
      ) : (
        <div style={{ width: 28, flexShrink: 0 }} />
      )}
      <div className="message-bubble-wrap">
        {showAvatar && (
          <div className="message-meta">
            <span className="message-sender-name">{isOwn ? 'You' : msg.username}</span>
            <span>{formatTime(msg.timestamp)}</span>
          </div>
        )}
        <div className={`message-bubble ${isOwn ? 'own' : 'other'}`} data-id={dataId}>
          {msg.text.split('\n').map((line, i) => (
            <span key={i}>{line}{i < msg.text.split('\n').length - 1 ? <br /> : null}</span>
          ))}
          
          {isOwn && msg.type === 'chat' && (
            <div style={{ fontSize: '0.65rem', textAlign: 'right', marginTop: '4px', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
              <span>{formatTime(msg.timestamp)}</span>
              <span title={msg.status === 'read' ? `Read by: ${msg.readBy.join(', ')}` : 'Sent'}>
                {msg.status === 'read' ? '✓✓' : '✓'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
