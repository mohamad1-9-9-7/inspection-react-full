import React, { useEffect } from 'react';

/**
 * Modal — نافذة حوار موحدة
 * يستبدل جميع الـ modals المنتشرة في المشروع
 *
 * مثال:
 *   <Modal show={open} title="تأكيد الحذف" onClose={() => setOpen(false)}>
 *     <p>هل أنت متأكد؟</p>
 *     <div style={{ display:'flex', gap: 8, marginTop: 16 }}>
 *       <Button variant="danger" onClick={handleDelete}>حذف</Button>
 *       <Button variant="ghost"  onClick={() => setOpen(false)}>إلغاء</Button>
 *     </div>
 *   </Modal>
 */
export default function Modal({
  show,
  title,
  onClose,
  children,
  maxWidth = 480,
  closeOnBackdrop = true,
}) {
  // إغلاق بـ Escape
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, onClose]);

  // منع scroll الصفحة لما المودال مفتوح
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: 'var(--space-4)',
        backdropFilter: 'blur(4px)',
        animation: 'qms-fade-in 0.15s ease both',
      }}
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth,
          position: 'relative',
          padding: 'var(--space-6)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* زر الإغلاق */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              position: 'absolute',
              top: 14, insetInlineEnd: 16,
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ✕
          </button>
        )}

        {/* العنوان */}
        {title && (
          <div style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-5)',
            paddingInlineEnd: 32,
          }}>
            {title}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
