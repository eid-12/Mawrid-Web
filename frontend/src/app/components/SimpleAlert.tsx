import { useEffect, useState } from 'react';

interface SimpleAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export const SimpleAlert = ({
  isOpen,
  onClose,
  title,
  message,
}: SimpleAlertProps) => {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const t = setTimeout(() => setRendered(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!rendered) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* Alert Box */}
      <div
        className="relative w-full shadow-2xl"
        style={{
          maxWidth: '320px',
          backgroundColor: '#2D2D2D',
          borderRadius: '14px',
          padding: '20px 22px 18px 22px',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(8px)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1)',
        }}
      >
        {/* Title */}
        <p
          style={{
            fontSize: '11px',
            color: '#9CA3AF',
            fontWeight: 400,
            marginBottom: '10px',
            letterSpacing: '0.01em',
          }}
        >
          {title}
        </p>

        {/* Message */}
        <p
          style={{
            fontSize: '15px',
            color: '#FFFFFF',
            fontWeight: 600,
            lineHeight: '1.5',
            marginBottom: '20px',
          }}
        >
          {message}
        </p>

        {/* OK Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#7BB5E8',
              color: '#1A1A1A',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '999px',
              padding: '6px 32px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#93C5F5')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7BB5E8')}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
