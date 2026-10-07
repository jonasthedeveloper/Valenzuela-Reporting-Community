import Icon from './Icon';

/**
 * "Post as" identity selector — the public display choice only.
 * The backend always stores the authenticated user + is_anonymous flag.
 *
 * variant "cards" → two radio cards (create-post / announcement forms)
 * variant "chips" → compact inline toggle (comment / reply composers)
 */
export default function PostAs({
  value,
  onChange,
  label = 'Post as',
  noun = 'Post',
  variant = 'cards',
  hint,
  name = 'postAs',
}) {
  const options = [
    { anonymous: false, icon: 'user', title: 'My Account', text: 'Show my name' },
    { anonymous: true, icon: 'eye-off', title: 'Anonymous', text: 'Hide my name' },
  ];

  if (variant === 'chips') {
    return (
      <span className="post-as-chips" role="radiogroup" aria-label={label}>
        <span className="post-as-chips-label">{label}:</span>
        {options.map((option) => (
          <button
            key={String(option.anonymous)}
            type="button"
            role="radio"
            aria-checked={value === option.anonymous}
            className={`post-as-chip${value === option.anonymous ? ' is-active' : ''}`}
            onClick={() => onChange(option.anonymous)}
          >
            <Icon name={option.icon} size={13} />
            {option.title}
          </button>
        ))}
      </span>
    );
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="post-as" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label
            key={String(option.anonymous)}
            className={`post-as-card${value === option.anonymous ? ' is-selected' : ''}`}
          >
            <input
              type="radio"
              name={name}
              checked={value === option.anonymous}
              onChange={() => onChange(option.anonymous)}
            />
            <span className="post-as-card-ico">
              <Icon name={option.icon} size={17} />
            </span>
            <span>
              <span className="post-as-card-title">{option.title}</span>
              <span className="post-as-card-text">
                {option.anonymous ? `${noun} shows as Anonymous` : option.text}
              </span>
            </span>
          </label>
        ))}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
