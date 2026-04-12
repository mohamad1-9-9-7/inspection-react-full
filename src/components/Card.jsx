import React from 'react';

/**
 * Card — بطاقة موحدة
 *
 * size: 'sm' | 'md'
 *
 * مثال:
 *   <Card title="معلومات الفرع">...</Card>
 *   <Card size="sm" style={{ background: '#f0f9ff' }}>...</Card>
 */
export default function Card({
  children,
  title,
  size = 'md',
  style,
  className = '',
  ...rest
}) {
  const classes = [
    'qms-card',
    size === 'sm' ? 'qms-card-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...rest}>
      {title && (
        <div style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
