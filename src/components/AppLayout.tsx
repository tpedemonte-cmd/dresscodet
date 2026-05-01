import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Shirt, Plus, Sparkles, LogOut, Clock, BarChart3, ShoppingBag, Heart, ScanFace, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Shirt, label: 'Mi Placard' },
    { path: '/agregar', icon: Plus, label: 'Agregar' },
    { path: '/probador', icon: ScanFace, label: 'Probador' },
    { path: '/looks', icon: ImageIcon, label: 'Looks' },
    { path: '/recomendar', icon: Sparkles, label: 'Outfit' },
    { path: '/historial', icon: Clock, label: 'Historial' },
    { path: '/estadisticas', icon: BarChart3, label: 'Stats' },
    { path: '/tienda', icon: ShoppingBag, label: 'Tienda' },
    { path: '/wishlist', icon: Heart, label: 'Wishlist' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground">Mi Placard</h1>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border z-50">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex sm:justify-around min-w-max sm:min-w-0 px-2 py-2 gap-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors flex-shrink-0 min-w-[64px] ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] sm:text-xs font-body font-medium whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
