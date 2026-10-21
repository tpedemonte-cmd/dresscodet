import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Pencil, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// El e-mail tiene que entrar entero en una sola línea. En vez de cortarlo con
// puntos suspensivos o de pasarlo a un segundo renglón, se mide cuánto ocupa y
// se achica la letra justo lo necesario (nunca menos de 12px).
function useFitOneLine(text: string) {
  const ref = useRef<HTMLParagraphElement>(null);
  const baseRef = useRef<number | null>(null);
  const [fit, setFit] = useState<{ size: number; single: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent || !text) return;

    let lastWidth = -1;

    const measure = (force = false) => {
      const avail = parent.clientWidth;
      if (!force && avail === lastWidth) return;
      lastWidth = avail;
      if (avail <= 0) return;

      const cs = getComputedStyle(el);
      if (baseRef.current === null) baseRef.current = parseFloat(cs.fontSize) || 16;
      const base = baseRef.current;

      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.fontStyle = cs.fontStyle;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.fontSize = `${base}px`;
      probe.textContent = text;
      document.body.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      if (!width) return;

      const needed = ((avail - 1) / width) * base;
      setFit({
        size: Math.max(12, Math.min(base, Math.floor(needed * 100) / 100)),
        single: needed >= 12,
      });
    };

    measure(true);
    const observer = new ResizeObserver(() => measure());
    observer.observe(parent);
    document.fonts?.ready.then(() => measure(true)).catch(() => {});
    return () => observer.disconnect();
  }, [text]);

  return { ref, fit };
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? '';
  const { ref: emailRef, fit: emailFit } = useFitOneLine(email);
  const userName = String(
    user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0] || 'Mi perfil'
  );

  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editOpen) setNameDraft(userName === 'Mi perfil' ? '' : userName);
  }, [editOpen, userName]);

  const openEdit = () => {
    setNameDraft(userName === 'Mi perfil' ? '' : userName);
    setEditOpen(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error('Escribí un nombre de usuario.');
      return;
    }
    if (trimmed === userName) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar el cambio. Intentá de nuevo.');
      return;
    }
    setEditOpen(false);
    toast.success('Nombre de usuario actualizado.');
  };

  return (
    <div className="mx-auto max-w-md">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        aria-label="Volver"
        className="-ml-2 mb-1 text-foreground"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <h1 className="font-body text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
        Información de tu perfil
      </h1>
      <p className="mt-2 font-body text-base text-muted-foreground">
        Los datos de tu cuenta en DressCode.
      </p>

      <section className="mt-8">
        <h2 className="font-body text-lg font-semibold text-foreground">Información personal</h2>
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-4 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-base font-medium text-foreground">{userName}</p>
              <p className="font-body text-sm text-muted-foreground">Nombre de usuario.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={openEdit}
              aria-label="Cambiar nombre de usuario"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                ref={emailRef}
                style={emailFit ? { fontSize: `${emailFit.size}px` } : undefined}
                className={cn(
                  'break-all font-body text-base font-medium text-foreground',
                  emailFit?.single && 'whitespace-nowrap'
                )}
              >
                {email || 'Sin e-mail'}
              </p>
              <p className="font-body text-sm text-muted-foreground">E-mail de tu cuenta.</p>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar tu nombre de usuario</DialogTitle>
            <DialogDescription>
              Así te mostramos en la app, por ejemplo en tu perfil.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Tu nombre de usuario"
              maxLength={40}
              autoFocus
              aria-label="Nuevo nombre de usuario"
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
