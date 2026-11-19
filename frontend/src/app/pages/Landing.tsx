import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Shield, Mail, RefreshCw, Ban, ArrowRight, ArrowLeft, Moon, Sun } from 'lucide-react';
import { Card } from '../components/Card';
import { useTheme } from '../contexts/ThemeProvider';
import { landingCopy } from './landing-copy';

export default function Landing() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const arabic = pathname.replace(/\/+$/, '') === '/ar';
  const copy = landingCopy[arabic ? 'ar' : 'en'];
  const { theme, toggleTheme } = useTheme();
  const icons = [Shield, Mail, RefreshCw, Ban];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <p className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>{copy.brand}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-background hover:bg-muted transition-all flex items-center justify-center"
              aria-label={theme === 'light' ? copy.themeDark : copy.themeLight}>
              {theme === 'light' ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
            </button>
            <Link to={arabic ? '/' : '/ar/'} lang={arabic ? 'en' : 'ar'} dir={arabic ? 'ltr' : 'rtl'}
              className="px-2 py-2 text-sm font-medium underline underline-offset-4 hover:text-primary">
              {copy.switchLanguage}
            </Link>
            <Button variant="secondary" onClick={() => navigate('/login')}>{copy.login}</Button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6" style={{ color: 'var(--text-heading)' }}>
            {copy.headline}
            <span className="block mt-2 bg-gradient-to-r from-[#8CCDE6] via-[#87ABE7] to-[#8393DE] bg-clip-text text-transparent">{copy.highlight}</span>
          </h1>
          <p className="text-base md:text-xl text-foreground mb-8 md:mb-10 leading-relaxed">{copy.description}</p>
          <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
            <Button icon={arabic ? ArrowLeft : ArrowRight} iconPosition="right" size="lg" onClick={() => navigate('/signup')}>{copy.join}</Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>{copy.login}</Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8 md:mb-12" style={{ color: 'var(--text-heading)' }}>{copy.featuresTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {copy.features.map(([title, description], index) => {
            const Icon = icons[index];
            return <Card key={index} hover>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-sidebar-accent border border-border flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </Card>;
          })}
        </div>
      </section>

      <section id="borrowing-guide" aria-labelledby="borrowing-title" className="max-w-7xl mx-auto px-4 md:px-6 pb-12 md:pb-20">
        <h2 id="borrowing-title" className="text-2xl md:text-3xl font-semibold text-center mb-8" style={{ color: 'var(--text-heading)' }}>{copy.guideTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {copy.steps.map(([title, description], index) => <Card key={index}>
            <h3 className="text-lg font-semibold mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
          </Card>)}
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <nav aria-label={copy.projects} className="mb-6 space-y-3">
            <p className="font-semibold text-foreground">{copy.projects}</p>
            <p><a className="text-foreground underline underline-offset-4 hover:text-primary" href="https://www.cloudbase.website/">CloudBase</a>: {copy.cloudDescription}</p>
            <p><a className="text-foreground underline underline-offset-4 hover:text-primary" href="https://maps.cloudbase.website/">Wakeb Maps</a>: {copy.mapsDescription}</p>
          </nav>
          <p>&copy; 2026 {copy.brand}. {copy.footer}</p>
        </div>
      </footer>
    </div>
  );
}
