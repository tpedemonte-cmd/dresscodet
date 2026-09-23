import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? '';
  const userName = String(
    user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0] || 'Mi perfil'
  );

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
          </div>
          <div className="flex items-center gap-4 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-base font-medium text-foreground">{email || 'Sin e-mail'}</p>
              <p className="font-body text-sm text-muted-foreground">E-mail de tu cuenta.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
