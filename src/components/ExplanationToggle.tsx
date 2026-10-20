import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import IconText from '@/components/IconText';
import { Button } from '@/components/ui/button';

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
      <Button
        variant="ghost"
        type="button"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="h-auto p-0 flex items-center gap-1 text-xs font-body font-medium text-primary hover:opacity-80"
      >
        <IconText text={open ? 'Ocultar explicación' : label} />
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && <div className="mt-2 animate-in fade-in slide-in-from-top-1">{children}</div>}
    </div>
  );
}
