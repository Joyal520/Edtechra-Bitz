import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ClassroomOptionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  preferredAlign?: 'left' | 'right';
  widthPx?: number;
  children: React.ReactNode;
}

interface DropdownPosition {
  top: number;
  left: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

export const ClassroomOptionsDropdown: React.FC<ClassroomOptionsDropdownProps> = ({
  isOpen,
  onClose,
  anchorRef,
  preferredAlign = 'left',
  widthPx = 256,
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const menuWidth = Math.min(widthPx, viewportW - margin * 2);
    const measuredHeight = menuRef.current?.offsetHeight || 280;

    // Horizontal alignment clamped within viewport edges
    let left =
      preferredAlign === 'right'
        ? rect.right - menuWidth
        : rect.left;

    left = Math.max(margin, Math.min(left, viewportW - menuWidth - margin));

    // Vertical placement: flip above if insufficient space below
    const spaceBelow = viewportH - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;
    const placeAbove = spaceBelow < Math.min(measuredHeight, 220) && spaceAbove > spaceBelow;

    const top = placeAbove
      ? Math.max(margin, rect.top - gap - Math.min(measuredHeight, spaceAbove))
      : rect.bottom + gap;

    const maxHeight = Math.max(160, placeAbove ? spaceAbove : spaceBelow);

    setPosition({
      top,
      left,
      maxHeight,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, [anchorRef, preferredAlign, widthPx]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, anchorRef, onClose, updatePosition]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: position ? `${position.top}px` : '-9999px',
        left: position ? `${position.left}px` : '-9999px',
        width: `${Math.min(widthPx, typeof window !== 'undefined' ? window.innerWidth - 24 : widthPx)}px`,
        maxHeight: position ? `${position.maxHeight}px` : undefined,
        visibility: position ? 'visible' : 'hidden',
        transformOrigin: position?.placement === 'top' ? 'bottom center' : 'top center',
      }}
      className="z-[9990] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-[0_18px_40px_-6px_rgba(15,23,42,0.22),0_4px_12px_rgba(15,23,42,0.08)] p-2 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 text-slate-800"
    >
      {children}
    </div>,
    document.body
  );
};
