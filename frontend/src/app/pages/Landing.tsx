import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Shield, Mail, RefreshCw, Ban, ArrowRight, Moon, Sun } from 'lucide-react';
import { Card } from '../components/Card';
import { useTheme } from '../contexts/ThemeProvider';

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const features = [
    {
      icon: Shield,
      title: 'Data Isolation',
      description: 'Each college has its own isolated data space for maximum security and privacy.',
    },
    {
      icon: Mail,
      title: 'Email Verification',
      description: 'University email verification ensures only authorized users can access the system.',
    },
    {
      icon: RefreshCw,
      title: 'Auto Status Update',
      description: 'Real-time status updates keep everyone informed about equipment availability.',
    },
    {
      icon: Ban,
      title: 'No Double Booking',
      description: 'Smart conflict prevention ensures equipment is never double-booked.',
    },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <h1 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Mawrid</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-background hover:bg-muted transition-all flex items-center justify-center"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <Button variant="secondary" onClick={() => navigate('/login')}>
              Log in
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6" style={{ color: 'var(--text-heading)' }}>
            University Equipment Management,
            <span className="block mt-2 bg-gradient-to-r from-[#8CCDE6] via-[#87ABE7] to-[#8393DE] bg-clip-text text-transparent">
              Simplified
            </span>
          </h2>
          <p className="text-base md:text-xl text-foreground mb-8 md:mb-10 leading-relaxed">
            Mawrid streamlines equipment lending and lab resource management for universities. 
            Browse, request, and track equipment with ease.
          </p>
          <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
            <Button icon={ArrowRight} iconPosition="right" size="lg" onClick={() => navigate('/login')}>
              Join now
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
              Log in
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20">
        <h3 className="text-2xl md:text-3xl font-semibold text-center mb-8 md:mb-12" style={{ color: 'var(--text-heading)' }}>
          Why Choose Mawrid?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature) => (
            <Card key={feature.title} hover>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-sidebar-accent border border-border flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Mawrid. University Equipment Management System.</p>
        </div>
      </footer>
    </div>
  );
}