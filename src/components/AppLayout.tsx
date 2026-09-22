import { useState } from 'react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Shirt, Plus, Sparkles, LogOut, Clock, BarChart3, ShoppingBag, Heart, ScanFace, ImageIcon, CalendarDays, Star, Plane, Lock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import PlanSwitcher from '@/components/PlanSwitcher';
import AdBanner from '@/components/AdBanner';
import { usePlan } from '@/lib/plan';

const navItems = [
  { path: '/', icon: Shirt, label: 'DressCode' },
  { path: '/agregar', icon: Plus, label: 'Agregar' },
  { path: '/probador', icon: ScanFace, label: 'Probador' },
  { path: '/looks', icon: ImageIcon, label: 'Looks' },
  { path: '/recomendar', icon: Sparkles, label: 'Outfit' },
  { path: '/plan', icon: CalendarDays, label: 'Plan', premium: true },
  { path: '/viaje', icon: Plane, label: 'Viajes', premium: true },
  { path: '/favoritos', icon: Star, label: 'Favoritos' },
  { path: '/historial', icon: Clock, label: 'Historial' },
  { path: '/estadisticas', icon: BarChart3, label: 'Stats' },
  { path: '/tienda', icon: ShoppingBag, label: 'Tienda' },
  { path: '/wishlist', icon: Heart, label: 'Wishlist' },
];

// Los más importantes: quedan fijos en la barra de abajo del celular
const primaryPaths = ['/', '/agregar', '/recomendar', '/probador', '/looks'];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { isPremium, loading: planLoading } = usePlan();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const renderNavItem = ({ path, icon: Icon, label, premium }: (typeof navItems)[number], inSheet = false) => {
    const isActive = location.pathname === path;
    const isLocked = !planLoading && !isPremium && premium;
    return (
      <Link
        key={path}
        to={path}
        onClick={inSheet ? () => setMenuOpen(false) : undefined}
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors flex-shrink-0 min-w-[64px] ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span className="relative">
          <Icon className="h-5 w-5" />
          {isLocked && <Lock className="absolute -right-2 -top-1 h-3 w-3 rounded-full bg-card text-primary" />}
        </span>
        <span className="text-[10px] sm:text-xs font-body font-medium whitespace-nowrap">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground">DressCode</h1>
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ver todas las funciones" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="rounded-b-2xl">
                <SheetHeader className="pb-1">
                  <SheetTitle className="text-base font-display">Todas las funciones</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-1 px-4 pb-6">
                  {navItems.map((item) => renderNavItem(item, true))}
                </div>
              </SheetContent>
            </Sheet>
            <PlanSwitcher />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border z-40 max-w-full">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex sm:justify-around min-w-max sm:min-w-0 px-2 py-2 gap-1">
            {navItems.map((item) =>
              primaryPaths.includes(item.path) ? renderNavItem(item) : (
                <div key={item.path} className="hidden sm:flex">{renderNavItem(item)}</div>
              )
            )}
          </div>
        </div>
      </nav>
      <AdBanner index={0} />
    </div>
  );
}
