import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PlanProvider } from "@/lib/plan";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Wardrobe from "./pages/Wardrobe";
import AddItem from "./pages/AddItem";
import Tryon from "./pages/Tryon";
import Recommend from "./pages/Recommend";
import History from "./pages/History";
import Stats from "./pages/Stats";
import Marketplace from "./pages/Marketplace";
import Wishlist from "./pages/Wishlist";
import Looks from "./pages/Looks";
import Plan from "./pages/Plan";
import Travel from "./pages/Travel";
import Favorites from "./pages/Favorites";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import HorizontalScroller from "@/components/HorizontalScroller";

// TEMP: verificación visual del scroller, se borra después de probarla
const DevScroller = () => (
  <div className="max-w-sm mx-auto p-4 space-y-8">
    <HorizontalScroller ariaLabel="una sola">
      <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-secondary" />
    </HorizontalScroller>
    <HorizontalScroller ariaLabel="muchas">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-20 h-20 rounded-lg bg-secondary" />
      ))}
    </HorizontalScroller>
  </div>
);

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" />;
  return <AppLayout>{children}</AppLayout>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
      <Route path="/" element={<ProtectedRoute><Wardrobe /></ProtectedRoute>} />
      <Route path="/agregar" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
      <Route path="/probador" element={<ProtectedRoute><Tryon /></ProtectedRoute>} />
      <Route path="/recomendar" element={<ProtectedRoute><Recommend /></ProtectedRoute>} />
      <Route path="/historial" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/estadisticas" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="/tienda" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
      <Route path="/looks" element={<ProtectedRoute><Looks /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
      <Route path="/viaje" element={<ProtectedRoute><Travel /></ProtectedRoute>} />
      <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
      <Route path="/pago/:sessionId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/favoritos" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dev-scroller" element={<DevScroller />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PlanProvider>
            <AppRoutes />
          </PlanProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
