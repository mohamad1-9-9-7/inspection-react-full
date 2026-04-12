import React from 'react';

/**
 * Button — الزر الموحد للمشروع
 *
 * variant: 'primary' | 'success' | 'danger' | 'ghost'
 * size:    'sm' | 'md' | 'lg'
 *
 * مثال:
 *   <Button variant="primary" onClick={save}>حفظ</Button>
 *   <Button variant="danger" size="sm" disabled={loading}>حذف</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  style,
  className = '',
  ...rest
}) {
  const classes = [
    'qms-btn',
    `qms-btn-${variant}`,
    size === 'sm' ? 'qms-btn-sm' : size === 'lg' ? 'qms-btn-lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {loading && (
        <span style={{
          width: 14, height: 14,
          border: '2px solid rgba(255,255,255,0.4)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'qms-spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {children}
    </button>
  );
}
