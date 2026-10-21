import { useEffect, useState } from 'react';
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

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? '';
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
              <p className="break-all font-body text-base font-medium text-foreground">{email || 'Sin e-mail'}</p>
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
