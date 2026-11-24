import React from 'react';

const VARIANT_STYLES = {
  primary: {
    background: 'var(--ink-soft)',
    color: 'var(--on-ink)',
    border: '1px solid var(--ink-soft)',
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--fg)',
    border: '1px solid var(--line)',
  },
  danger: {
    background: 'var(--danger)',
    color: 'var(--accent-ink)',
    border: 'none',
  },
};

const IconButton = ({
  icon,
  variant = 'primary',
  borderRadius = '1rem',
  size = 40,
  className = '',
  style = {},
  ...rest
}) => {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const mergedStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius,
    width: size,
    height: size,
    padding: 0,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontSize: 0,
    ...variantStyle,
    ...style,
  };

  return (
    <button
      type="button"
      className={`hover:opacity-80 active:opacity-80 focus:opacity-80 ${className}`}
      style={mergedStyle}
      {...rest}
    >
      <span className="material-icons-round" style={{ color: variantStyle.color, fontSize: 20 }}>
        {icon}
      </span>
    </button>
  );
};

export default IconButton; 