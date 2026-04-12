import React from 'react';

/**
 * LoadingSpinner — مؤشر تحميل موحد
 *
 * size:    'sm' | 'md' | 'lg'
 * message: نص اختياري تحت الأيقونة
 * fullPage: يملأ الشاشة كاملة
 *
 * مثال:
 *   <LoadingSpinner />
 *   <LoadingSpinner size="sm" message="جاري التحميل..." />
 *   <LoadingSpinner fullPage message="يرجى الانتظار" />
 */
export default function LoadingSpinner({
  size = 'md',
  message,
  fullPage = false,
}) {
  const sizes = { sm: 22, md: 36, lg: 52 };
  const px = sizes[size] || sizes.md;
  const border = Math.max(2, px / 10);

  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: px,
        height: px,
        border: `${border}px solid var(--border-color)`,
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'qms-spin 0.75s linear infinite',
      }} />
      {message && (
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          {message}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 8000,
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
    }}>
      {spinner}
    </div>
  );
}
