import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantStyles = {
      primary: 'bg-gradient-to-r from-[#8CCDE6] via-[#87ABE7] to-[#8393DE] text-white shadow-[0_10px_20px_rgba(131,147,222,0.25)] hover:shadow-[0_12px_24px_rgba(131,147,222,0.35)] active:shadow-[0_8px_16px_rgba(131,147,222,0.3)] focus:ring-[#8393DE]/50',
      secondary: 'bg-white text-[#334155] border border-[#E2E8F0] hover:bg-[#F5F9FF] active:bg-[#E2F2F9] focus:ring-[#8393DE]/50',
      ghost: 'bg-transparent text-[#334155] hover:bg-[#F5F9FF] active:bg-[#E2F2F9] focus:ring-[#8393DE]/50',
      outline: 'bg-transparent text-[#8393DE] border border-[#8393DE] hover:bg-[#F9FAFD] active:bg-[#E0E4F7] focus:ring-[#8393DE]/50'
    };
    
    const sizeStyles = {
      sm: variant === 'primary' ? 'h-9 px-4 rounded-full' : 'h-9 px-4 rounded-2xl',
      md: variant === 'primary' ? 'h-11 px-6 rounded-full' : 'h-11 px-6 rounded-2xl',
      lg: variant === 'primary' ? 'h-12 px-8 rounded-full' : 'h-12 px-8 rounded-2xl',
    };
    
    const iconSizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled}
        {...props}
      >
        {Icon && iconPosition === 'left' && (
          <span className={`flex items-center justify-center ${variant === 'primary' ? 'w-7 h-7 rounded-full border border-white/30 bg-white/10' : ''}`}>
            <Icon className={iconSizeStyles[size]} />
          </span>
        )}
        {children}
        {Icon && iconPosition === 'right' && (
          <Icon className={iconSizeStyles[size]} />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
