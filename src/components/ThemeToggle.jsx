import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`btn btn-ghost ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ padding: '8px', width: '40px', height: '40px', borderRadius: '50%' }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
