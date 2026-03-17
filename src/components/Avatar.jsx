function getInitials(username) {
  return username
    .split('_')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || username.slice(0, 2).toUpperCase();
}

export default function Avatar({ username, color, size = 'md' }) {
  const initials = getInitials(username);
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: color || '#333', color: '#fff' }}
      title={username}
    >
      {initials}
    </div>
  );
}
