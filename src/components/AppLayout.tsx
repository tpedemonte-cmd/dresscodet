import { useState } from 'react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Shirt, Plus, Sparkles, LogOut, Clock, BarChart3, ShoppingBag, Heart, ScanFace, ImageIcon, CalendarDays, Star, Plane, Lock, Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import PlanSwitcher from '@/components/PlanSwitcher';
import AdBanner from '@/components/AdBanner';
import { usePlan } from '@/lib/plan';
import dressCodeLogo from '@/assets/dresscode-logo.png';

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

const functionGroups = [
  {
    label: 'Vestidor',
    paths: ['/', '/agregar', '/probador', '/looks', '/recomendar'],
  },
  {
    label: 'Organizá tu estilo',
    paths: ['/plan', '/viaje', '/favoritos', '/historial', '/estadisticas'],
  },
  {
    label: 'Compras',
    paths: ['/tienda', '/wishlist'],
  },
];

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
        className={`flex flex-col items-center gap-1 px-1 sm:px-3 py-2 rounded-lg transition-colors flex-shrink-0 min-w-[56px] sm:min-w-[64px] ${
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

  const renderFunctionRow = ({ path, icon: Icon, label, premium }: (typeof navItems)[number]) => {
    const isActive = location.pathname === path;
    const isLocked = !planLoading && !isPremium && premium;

    return (
      <Link
        key={path}
        to={path}
        onClick={() => setMenuOpen(false)}
        className={`flex min-h-16 items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
          isActive ? 'text-primary' : 'text-foreground'
        }`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <Icon className="h-7 w-7" strokeWidth={1.8} />
          {isLocked && <Lock className="absolute -right-0.5 top-0 h-3.5 w-3.5 rounded-full bg-background text-primary" />}
        </span>
        <span className="min-w-0 flex-1 text-left font-body text-base font-medium">{label}</span>
        {isLocked ? (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase text-primary">Premium</span>
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" aria-label="Ir al guardarropas" className="flex shrink-0 items-center">
            <img
              src={dressCodeLogo}
              alt="DressCode"
              width={254}
              height={225}
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>
          <div className="flex items-center gap-2">
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

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border z-[60] max-w-full">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex sm:justify-around min-w-max sm:min-w-0 px-2 py-2 gap-1">
            {navItems.map((item) =>
              primaryPaths.includes(item.path) ? renderNavItem(item) : (
                <div key={item.path} className="hidden sm:flex">{renderNavItem(item)}</div>
              )
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Ver todas las funciones"
                  className={`sm:hidden h-auto min-w-[56px] flex-shrink-0 flex-col gap-1 px-1 py-2 ${
                    menuOpen ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Menu className="h-5 w-5" />
                  <span className="text-[10px] font-body font-medium">Funciones</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="top"
                className="bottom-[65px] flex h-auto flex-col gap-0 overflow-hidden border-b-0 p-0 shadow-none sm:bottom-0 sm:left-auto sm:w-full sm:max-w-md sm:border-l"
              >
                <SheetHeader className="shrink-0 border-b border-border px-5 py-5 text-left">
                  <SheetTitle className="pr-10 text-xl font-display">Todas las funciones</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto overscroll-contain pb-5">
                  {functionGroups.map((group, index) => (
                    <section key={group.label} className={index > 0 ? 'border-t border-border' : undefined}>
                      <h2 className="px-5 pb-2 pt-5 font-body text-sm font-semibold text-muted-foreground">
                        {group.label}
                      </h2>
                      <div>
                        {group.paths.map((path) => {
                          const item = navItems.find((navItem) => navItem.path === path);
                          return item ? renderFunctionRow(item) : null;
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <AdBanner index={0} />
    </div>
  );
}
