import { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'sky' | 'indigo' | 'green' | 'orange' | 'red';
}

export const StatCard = ({ icon: Icon, label, value, trend, color = 'sky' }: StatCardProps) => {
  const colorStyles = {
    sky: 'bg-[#F9FCFE] dark:bg-[#2D3748] text-[#8CCDE6]',
    indigo: 'bg-[#F9FAFD] dark:bg-[#2D3748] text-[#8393DE]',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  };
  
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{value}</p>
          {trend && (
            <p className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${colorStyles[color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </Card>
  );
};