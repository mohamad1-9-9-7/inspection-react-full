import React from 'react';
import Button from './Button';

/**
 * EmptyState — حالة عدم وجود بيانات
 *
 * مثال:
 *   <EmptyState message="لا توجد تقارير" />
 *   <EmptyState icon="📋" message="لا يوجد نتائج" sub="جرّب تغيير الفلاتر" />
 *   <EmptyState message="لا توجد بيانات" action="إضافة تقرير" onAction={handleAdd} />
 */
export default function EmptyState({
  icon = '📂',
  message = 'لا توجد بيانات',
  sub,
  action,
  onAction,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12) var(--space-6)',
      gap: 'var(--space-3)',
      color: 'var(--text-secondary)',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: 48, lineHeight: 1, opacity: 0.7 }}>{icon}</span>
      <span style={{
        fontSize: 'var(--font-size-md)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--text-secondary)',
      }}>
        {message}
      </span>
      {sub && (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {sub}
        </span>
      )}
      {action && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} style={{ marginTop: 8 }}>
          {action}
        </Button>
      )}
    </div>
  );
}
