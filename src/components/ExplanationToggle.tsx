import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  label?: string;
  className?: string;
}

/** Desplegable con flechita para mostrar u ocultar el texto explicativo. */
export default function ExplanationToggle({ children, label = 'Ver explicación', className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center gap-1 text-xs font-body font-medium text-primary hover:opacity-80"
      >
        {open ? 'Ocultar explicación' : label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2 animate-in fade-in slide-in-from-top-1">{children}</div>}
    </div>
  );
}
