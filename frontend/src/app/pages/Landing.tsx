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
            <p className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Mawrid</p>
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6" style={{ color: 'var(--text-heading)' }}>
            Mawrid: University Equipment Management,
            <span className="block mt-2 bg-gradient-to-r from-[#8CCDE6] via-[#87ABE7] to-[#8393DE] bg-clip-text text-transparent">
              Simplified
            </span>
          </h1>
          <p className="text-base md:text-xl text-foreground mb-8 md:mb-10 leading-relaxed">
            Mawrid streamlines equipment lending and lab resource management for universities. 
            Browse, request, and track equipment with ease.
          </p>
          <p lang="ar" dir="rtl" className="text-base md:text-xl text-foreground mb-8 leading-relaxed">&#1605;&#1608;&#1585;&#1583; &#1605;&#1606;&#1589;&#1577; &#1604;&#1573;&#1583;&#1575;&#1585;&#1577; &#1573;&#1593;&#1575;&#1585;&#1577; &#1575;&#1604;&#1605;&#1593;&#1583;&#1575;&#1578; &#1575;&#1604;&#1580;&#1575;&#1605;&#1593;&#1610;&#1577; &#1608;&#1581;&#1580;&#1586; &#1575;&#1604;&#1571;&#1580;&#1607;&#1586;&#1577; &#1608;&#1578;&#1578;&#1576;&#1593; &#1578;&#1608;&#1601;&#1585;&#1607;&#1575; &#1576;&#1610;&#1606; &#1575;&#1604;&#1603;&#1604;&#1610;&#1575;&#1578;.</p>
          <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
            <Button icon={ArrowRight} iconPosition="right" size="lg" onClick={() => navigate('/signup')}>
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
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8 md:mb-12" style={{ color: 'var(--text-heading)' }}>
          Why Choose Mawrid?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature) => (
            <Card key={feature.title} hover>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-sidebar-accent border border-border flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
      
      <section id="borrowing-guide" aria-labelledby="borrowing-title" className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20">
        <h2 id="borrowing-title" className="text-2xl md:text-3xl font-semibold text-center mb-4" style={{ color: 'var(--text-heading)' }}>How equipment borrowing works</h2>
        <p lang="ar" dir="rtl" className="text-center text-muted-foreground mb-8">&#1603;&#1610;&#1601; &#1578;&#1587;&#1578;&#1593;&#1610;&#1585; &#1575;&#1604;&#1605;&#1593;&#1583;&#1575;&#1578; &#1575;&#1604;&#1580;&#1575;&#1605;&#1593;&#1610;&#1577; &#1593;&#1576;&#1585; &#1605;&#1608;&#1585;&#1583;&#1567;</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-3">1. Find equipment</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">Browse the equipment catalog and check what is available for your college.</p>
            <p lang="ar" dir="rtl" className="text-muted-foreground leading-relaxed">&#1575;&#1587;&#1578;&#1593;&#1585;&#1590; &#1583;&#1604;&#1610;&#1604; &#1575;&#1604;&#1605;&#1593;&#1583;&#1575;&#1578; &#1608;&#1578;&#1581;&#1602;&#1602; &#1605;&#1606; &#1575;&#1604;&#1571;&#1580;&#1607;&#1586;&#1577; &#1575;&#1604;&#1605;&#1578;&#1575;&#1581;&#1577; &#1604;&#1603;&#1604;&#1610;&#1578;&#1603;.</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-3">2. Request a loan</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">Send a borrowing request for the equipment you need. College administrators review requests.</p>
            <p lang="ar" dir="rtl" className="text-muted-foreground leading-relaxed">&#1571;&#1585;&#1587;&#1604; &#1591;&#1604;&#1576; &#1575;&#1587;&#1578;&#1593;&#1575;&#1585;&#1577; &#1604;&#1604;&#1605;&#1593;&#1583;&#1575;&#1578; &#1575;&#1604;&#1578;&#1610; &#1578;&#1581;&#1578;&#1575;&#1580;&#1607;&#1575; &#1604;&#1610;&#1578;&#1605; &#1605;&#1585;&#1575;&#1580;&#1593;&#1578;&#1607; &#1605;&#1606; &#1573;&#1583;&#1575;&#1585;&#1577; &#1575;&#1604;&#1603;&#1604;&#1610;&#1577;.</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold mb-3">3. Follow your request</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">Sign in to follow request status and manage your equipment borrowing.</p>
            <p lang="ar" dir="rtl" className="text-muted-foreground leading-relaxed">&#1587;&#1580;&#1617;&#1604; &#1575;&#1604;&#1583;&#1582;&#1608;&#1604; &#1604;&#1605;&#1578;&#1575;&#1576;&#1593;&#1577; &#1581;&#1575;&#1604;&#1577; &#1591;&#1604;&#1576;&#1603; &#1608;&#1573;&#1583;&#1575;&#1585;&#1577; &#1575;&#1587;&#1578;&#1593;&#1575;&#1585;&#1577; &#1575;&#1604;&#1605;&#1593;&#1583;&#1575;&#1578;.</p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <nav aria-label="More projects" className="mb-6 space-y-3">
            <p className="font-semibold text-foreground">Explore more projects</p>
            <p><a className="text-foreground underline underline-offset-4 hover:text-primary" href="https://www.cloudbase.website/">CloudBase — <span lang="ar" dir="rtl">&#1603;&#1604;&#1575;&#1608;&#1583; &#1576;&#1610;&#1587;</span></a>: private cloud application deployment.</p>
            <p><a className="text-foreground underline underline-offset-4 hover:text-primary" href="https://maps.cloudbase.website/">Wakeb Maps — <span lang="ar" dir="rtl">&#1608;&#1575;&#1603;&#1576; &#1605;&#1575;&#1576;&#1586;</span></a>: interactive maps and place search.</p>
          </nav>
          <p>&copy; 2026 Mawrid. University Equipment Management System.</p>
        </div>
      </footer>
    </div>
  );
}
