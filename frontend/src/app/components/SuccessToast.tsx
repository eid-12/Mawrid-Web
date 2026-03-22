import { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

type ToastVariant = 'success' | 'cancel' | 'danger' | 'warning' | 'info';

interface ToastProps {
  isOpen: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

const variantConfig: Record<
  ToastVariant,
  {
    bg: string;
    border: string;
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    textColor: string;
    icon: 'check' | 'x' | 'alert';
  }
> = {
  success: {
    bg: '#F0FFF4',
    border: '#BBF7D0',
    iconBg: '#DCFCE7',
    iconBorder: '#86EFAC',
    iconColor: '#16A34A',
    textColor: '#15803D',
    icon: 'check',
  },
  cancel: {
    bg: '#FFF5F5',
    border: '#FECACA',
    iconBg: '#FEE2E2',
    iconBorder: '#FCA5A5',
    iconColor: '#DC2626',
    textColor: '#B91C1C',
    icon: 'x',
  },
  danger: {
    bg: '#FFF5F5',
    border: '#FECACA',
    iconBg: '#FEE2E2',
    iconBorder: '#FCA5A5',
    iconColor: '#DC2626',
    textColor: '#B91C1C',
    icon: 'alert',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    iconBorder: '#FCD34D',
    iconColor: '#D97706',
    textColor: '#B45309',
    icon: 'alert',
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconBorder: '#93C5FD',
    iconColor: '#2563EB',
    textColor: '#1D4ED8',
    icon: 'check',
  },
};

export const SuccessToast = ({
  isOpen,
  message,
  variant = 'success',
  duration = 3500,
  onClose,
}: ToastProps) => {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });

      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => {
            setRendered(false);
            onClose?.();
          }, 350);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setRendered(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, duration]);

  if (!rendered) return null;

  const cfg = variantConfig[variant];

  return (
    <div
      className="fixed top-6 left-1/2 z-[9999]"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0px' : '-20px'})`,
        opacity: visible ? 1 : 0,
        transition:
          'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="flex items-center gap-3 shadow-lg"
        style={{
          backgroundColor: cfg.bg,
          border: `1.5px solid ${cfg.border}`,
          borderRadius: '14px',
          padding: '10px 18px 10px 14px',
          minWidth: '230px',
          maxWidth: '340px',
        }}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: cfg.iconBg,
            border: `1.5px solid ${cfg.iconBorder}`,
          }}
        >
          {cfg.icon === 'check' ? (
            <Check
              style={{
                width: '14px',
                height: '14px',
                color: cfg.iconColor,
                strokeWidth: 3,
              }}
            />
          ) : cfg.icon === 'x' ? (
            <X
              style={{
                width: '13px',
                height: '13px',
                color: cfg.iconColor,
                strokeWidth: 3,
              }}
            />
          ) : (
            <AlertTriangle
              style={{
                width: '14px',
                height: '14px',
                color: cfg.iconColor,
                strokeWidth: 2.6,
              }}
            />
          )}
        </div>

        {/* Message */}
        <p
          className="text-sm"
          style={{ color: cfg.textColor, fontWeight: 500 }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};
