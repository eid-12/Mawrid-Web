import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = ({ 
  children, 
  padding = 'md', 
  hover = false, 
  className = '', 
  ...props 
}: CardProps) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div
      className={`bg-card rounded-2xl border border-border shadow-sm ${paddingStyles[padding]} ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-primary/30' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};