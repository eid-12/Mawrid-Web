export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-foreground mb-6">Page not found</p>
        <a href="/" className="text-primary hover:underline">Go back home</a>
      </div>
    </div>
  );
}