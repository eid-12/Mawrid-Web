import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router';
import { LucideIcon, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarLink {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  title: string;
  links: SidebarLink[];
  onLogout: () => void;
  footer?: ReactNode;
}

export const Sidebar = ({ title, links, onLogout, footer }: SidebarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <Menu className="w-6 h-6 text-foreground" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col
        fixed lg:sticky top-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Mawrid</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{title}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary font-medium border border-sidebar-border'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary' : 'text-muted-foreground'}`} />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        {footer && (
          <div className="p-4 border-t border-sidebar-border">
            {footer}
          </div>
        )}
        
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <ThemeToggle />
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onLogout();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};