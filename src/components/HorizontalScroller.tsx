import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Fila horizontal con barra de desplazamiento propia, siempre visible
 * (las barras nativas no se ven en la WebView del teléfono).
 * Aunque entre una sola prenda, la barra aparece completa.
 */
export default function HorizontalScroller({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 100 });

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth + 1) {
      setThumb({ left: 0, width: 100 });
      return;
    }
    const width = Math.max(15, (clientWidth / scrollWidth) * 100);
    const maxLeft = 100 - width;
    const left = (scrollLeft / (scrollWidth - clientWidth)) * maxLeft;
    setThumb({ left, width });
  }, []);

  useEffect(() => {
    updateThumb();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateThumb);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [updateThumb, children]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={scrollRef}
        onScroll={updateThumb}
        aria-label={ariaLabel}
        className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Desplazar a la izquierda"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="relative flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="absolute top-0 h-full rounded-full bg-muted-foreground/50 transition-[left,width] duration-100"
            style={{ left: `${thumb.left}%`, width: `${thumb.width}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Desplazar a la derecha"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
