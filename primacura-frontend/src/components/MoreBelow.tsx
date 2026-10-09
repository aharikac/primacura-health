import { RefObject, useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// "More below" hint for a scrolling area: a soft fade at the bottom edge and a
// small pill that scrolls down when tapped. Hidden once you reach the end.
export function useMoreBelow(ref: RefObject<HTMLElement | null>, resetKey: unknown) {
  const [more, setMore] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [resetKey, check, ref]);
  const scrollDown = () => {
    const el = ref.current;
    el?.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' });
  };
  return { more, check, scrollDown };
}

export function MoreBelow({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <>
      <div className="step-fade" aria-hidden="true" />
      <button type="button" className="step-more" onClick={onClick} aria-label="Scroll down for more">
        More below <ChevronDown size={16} strokeWidth={2.8} />
      </button>
    </>
  );
}
