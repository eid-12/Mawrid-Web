# Mawrid Dark/Light Mode Theme Guide

## Overview
The Mawrid platform now supports both **Dark Mode** and **Light Mode** with a seamless transition system powered by CSS Variables and React Context.

## Quick Start

### Using the Theme
The theme is automatically applied across the entire application. Users can toggle between Light and Dark modes using:
- **Sidebar**: ThemeToggle button at the bottom (for logged-in users)
- **Landing Page**: Theme toggle icon in the header (for visitors)

### Accessing Theme in Components
```tsx
import { useTheme } from '../contexts/ThemeProvider';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

## CSS Variables Reference

### Backgrounds
- `bg-background` - Main app background (#F5F9FF in light, #1A202C in dark)
- `bg-card` - Card surfaces (#FFFFFF in light, #2D3748 in dark)
- `bg-sidebar` - Sidebar background
- `bg-sidebar-accent` - Sidebar hover/active states
- `bg-muted` - Muted/disabled backgrounds
- `bg-input-background` - Input field backgrounds

### Text Colors
- `text-foreground` - Primary text color
- `text-muted-foreground` - Muted/secondary text
- Use inline styles for headings: `style={{ color: 'var(--text-heading)' }}`

### Borders & Accents
- `border-border` - Standard borders
- `border-sidebar-border` - Sidebar borders
- `text-primary` - Primary brand color (Indigo)
- `bg-primary` - Primary background
- `hover:bg-muted` - Hover states

### Complete Variable List

#### Light Mode Colors
```css
--app-background: #F5F9FF
--card-bg: #FFFFFF
--border-color: #E2E8F0
--text-heading: #0F172A
--text-body: #334155
--text-muted: #64748B
```

#### Dark Mode Colors
```css
--app-background: #1A202C
--card-bg: #2D3748
--border-color: #4A5568
--text-heading: #F7FAFC
--text-body: #E2E8F0
--text-muted: #A0AEC0
```

## Migration Guide

### Before (Hardcoded Colors)
```tsx
<div className="bg-white text-[#0F172A] border-[#E2E8F0]">
  <h2 className="text-[#0F172A]">Title</h2>
  <p className="text-[#64748B]">Description</p>
</div>
```

### After (Theme-Aware)
```tsx
<div className="bg-card text-foreground border-border">
  <h2 style={{ color: 'var(--text-heading)' }}>Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

## Common Patterns

### Cards
```tsx
<Card hover>
  {/* Card automatically uses bg-card and border-border */}
</Card>
```

### Headers/Titles
```tsx
<h1 style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
<p className="text-muted-foreground">Subtitle text</p>
```

### Buttons (Already Theme-Aware)
```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
```

### Input Fields (Already Theme-Aware)
```tsx
<Input 
  label="Email" 
  placeholder="Enter email"
  // Automatically adapts to theme
/>
```

### Hover States with Dark Mode Support
```tsx
<div className="hover:bg-muted dark:hover:bg-accent transition-colors">
  Hover me
</div>
```

## Brand Colors (Theme-Independent)
These colors remain consistent across themes:
- **Sky to Indigo Gradient**: `from-[#8CCDE6] to-[#8393DE]`
- Used for: Logo, primary buttons, highlights

## Accessibility
- All color combinations meet WCAG AA contrast standards
- Theme preference is saved to localStorage
- Respects system dark mode preference by default

## Examples

### Notification Cards
```tsx
<div className="p-3 bg-background rounded-xl border border-border">
  <p className="text-sm text-foreground">{message}</p>
  <p className="text-xs text-muted-foreground">{timestamp}</p>
</div>
```

### Stat Cards (Already Updated)
```tsx
<StatCard
  icon={Package}
  label="Active Items"
  value="24"
  color="indigo" // Automatically adapts to theme
/>
```

### Tables
```tsx
<table className="bg-card border border-border">
  <thead className="bg-muted">
    <tr>
      <th className="text-foreground">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-sidebar-accent">
      <td className="text-foreground">Data</td>
    </tr>
  </tbody>
</table>
```

## Files Already Updated
✅ ThemeProvider (contexts/ThemeProvider.tsx)
✅ theme.css (all CSS variables)
✅ App.tsx (ThemeProvider integration)
✅ Sidebar (ThemeToggle integration)
✅ All Layouts (UserLayout, AdminLayout, SuperAdminLayout)
✅ Card component
✅ StatCard component
✅ Input component
✅ Landing page
✅ Login page

## Files Needing Migration
The following files still use hardcoded colors and need updating:
- Dashboard pages (User, Admin, SuperAdmin)
- Settings pages
- Catalog and Inventory pages
- Request management pages
- Various admin panels

**Pattern to follow**: Replace all instances of:
- `bg-white` → `bg-card`
- `bg-[#F5F9FF]` → `bg-background`
- `text-[#0F172A]` → `style={{ color: 'var(--text-heading)' }}`
- `text-[#334155]` → `text-foreground`
- `text-[#64748B]` → `text-muted-foreground`
- `border-[#E2E8F0]` → `border-border`

## Testing Checklist
- [ ] Toggle between Light/Dark on Landing page
- [ ] Toggle between Light/Dark in Sidebar
- [ ] Check all cards render properly
- [ ] Check all forms and inputs
- [ ] Verify stat cards in dashboard
- [ ] Test hover states
- [ ] Verify brand gradient stays consistent
- [ ] Check localStorage persistence
- [ ] Test system preference detection

---

**Note**: The theme preference persists across sessions and is stored in localStorage as `mawrid-theme`.
