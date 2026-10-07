import Icon from './Icon';

export default function Button({
  children, variant = 'primary', size, icon, iconRight, loading = false,
  className = '', type = 'button', block = false, ...rest
}) {
  const classes = [
    'btn', `btn-${variant}`,
    size ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}
