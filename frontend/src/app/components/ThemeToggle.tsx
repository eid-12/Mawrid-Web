import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all duration-200 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground group border border-sidebar-border"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-5 h-5">
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <Sun className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
        <span className="text-sm font-medium">
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      </div>
      
      {/* Toggle Switch Visual */}
      <div className="w-10 h-6 rounded-full bg-muted/60 relative transition-all">
        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
          theme === 'dark' 
            ? 'right-1 bg-primary ring-2 ring-primary/30' 
            : 'left-1 bg-muted-foreground/60'
        }`} />
      </div>
    </button>
  );
}