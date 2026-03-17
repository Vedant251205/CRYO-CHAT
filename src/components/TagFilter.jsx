export default function TagFilter({ tags, activeTag, onSelectTag }) {
  return (
    <div className="tag-bar" role="tablist" aria-label="Filters">
      {tags.map(tag => (
        <button
          key={tag}
          className={`tag-btn ${activeTag === tag ? 'active' : ''}`}
          onClick={() => onSelectTag(tag)}
          role="tab"
          aria-selected={activeTag === tag ? 'true' : 'false'}
        >
          {tag.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
