import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';
  size?: 'sm' | 'md';
}

export const Badge = ({ 
  children, 
  variant = 'neutral', 
  size = 'md', 
  className = '', 
  ...props 
}: BadgeProps) => {
  const variantStyles = {
    success: 'bg-green-50 dark:bg-emerald-950/35 text-green-700 dark:text-emerald-300 border-green-200 dark:border-emerald-700/60',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50',
    error: 'bg-red-50 dark:bg-rose-950/35 text-red-700 dark:text-rose-300 border-red-200 dark:border-rose-700/60',
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50',
    neutral: 'bg-[#F7F8F9] dark:bg-gray-800/40 text-[#64748B] dark:text-gray-300 border-[#E2E8F0] dark:border-gray-600/50',
    pending: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };
  
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};