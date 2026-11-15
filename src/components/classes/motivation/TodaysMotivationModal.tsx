import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  MOTIVATION_CARDS,
  getBeanBodyColor,
  getCardBackground,
  getColomboDayIndex,
} from './motivationData';
import { MotivationIllustration } from './MotivationIllustrations';
import './motivation.css';

export interface TodaysMotivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_DAYS = MOTIVATION_CARDS.length;

export const TodaysMotivationModal: React.FC<TodaysMotivationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animState, setAnimState] = useState<'opening' | 'open' | 'closing'>('opening');
  const [currentIndex, setCurrentIndex] = useState<number>(() => getColomboDayIndex());
  const [direction, setDirection] = useState<1 | -1>(1);
  const [cardRenderKey, setCardRenderKey] = useState(0);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const todayIndex = getColomboDayIndex();

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Handle open / close lifecycle with smooth animation
  useEffect(() => {
    if (isOpen) {
      clearCloseTimer();
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setCurrentIndex(getColomboDayIndex());
      setDirection(1);
      setCardRenderKey((k) => k + 1);
      setRendered(true);
      setAnimState('opening');

      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimState('open');
          closeBtnRef.current?.focus({ preventScroll: true });
        });
      });

      return () => window.cancelAnimationFrame(raf);
    }

    if (rendered) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        setRendered(false);
        previousFocusRef.current?.focus?.({ preventScroll: true });
        return;
      }

      setAnimState('closing');
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setRendered(false);
        previousFocusRef.current?.focus?.({ preventScroll: true });
      }, 215);
    }
  }, [isOpen, rendered]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const showDay = useCallback((index: number, dir: 1 | -1 = 1) => {
    const normalized = ((index % TOTAL_DAYS) + TOTAL_DAYS) % TOTAL_DAYS;
    setCurrentIndex(normalized);
    setDirection(dir);
    setCardRenderKey((k) => k + 1);
  }, []);

  const handleNext = useCallback(() => {
    showDay(currentIndex + 1, 1);
  }, [currentIndex, showDay]);

  const handlePrev = useCallback(() => {
    showDay(currentIndex - 1, -1);
  }, [currentIndex, showDay]);

  const handleToday = useCallback(() => {
    const tIdx = getColomboDayIndex();
    showDay(tIdx, tIdx >= currentIndex ? 1 : -1);
  }, [currentIndex, showDay]);

  const handleSurpriseMe = useCallback(() => {
    let randomIdx = currentIndex;
    while (randomIdx === currentIndex) {
      randomIdx = Math.floor(Math.random() * TOTAL_DAYS);
    }
    showDay(randomIdx, 1);
  }, [currentIndex, showDay]);

  // Keyboard navigation & Escape to close while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Prevent background page scroll while modal is visible
  useEffect(() => {
    if (!rendered) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [rendered]);

  if (!rendered) return null;

  const activeCard = MOTIVATION_CARDS[currentIndex];
  const isViewingToday = currentIndex === todayIndex;

  const modalContent = (
    <div
      className="tm-motivation-overlay"
      data-state={animState}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="tm-motivation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-modal-title"
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="tm-close-btn"
          onClick={onClose}
          aria-label="Close Today's Motivation"
        >
          <X className="w-5 h-5" />
        </button>

        <header className="tm-modal-header">
          <h2 id="tm-modal-title" className="tm-modal-title">
            31 days of motivation
          </h2>
          <p className="tm-modal-subtitle">
            Pick a day. Read it. Carry it with you.
          </p>
        </header>

        <div className="tm-stage">
          <button
            type="button"
            className="tm-nav-btn"
            onClick={handlePrev}
            aria-label="Previous day"
          >
            ‹
          </button>

          <div className="tm-stack-wrap">
            {/* Subtle ambient sparkles */}
            <svg
              className="tm-ambient-sparkle tm-ambient-sparkle-1"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 2L14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5Z"
                fill="#ffd86b"
              />
            </svg>
            <svg
              className="tm-ambient-sparkle tm-ambient-sparkle-2"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 2L14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5Z"
                fill="#f06fa8"
              />
            </svg>
            <svg
              className="tm-ambient-sparkle tm-ambient-sparkle-3"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 2L14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5Z"
                fill="#92d0f5"
              />
            </svg>

            <div
              className="tm-stack"
              tabIndex={0}
              aria-live="polite"
              aria-label={`Day ${activeCard.day}: ${activeCard.message}`}
              onPointerDown={(e) => {
                pointerStartXRef.current = e.clientX;
              }}
              onPointerUp={(e) => {
                if (pointerStartXRef.current === null) return;
                const dx = e.clientX - pointerStartXRef.current;
                pointerStartXRef.current = null;
                if (dx < -40) {
                  handleNext();
                } else if (dx > 40) {
                  handlePrev();
                }
              }}
              onPointerCancel={() => {
                pointerStartXRef.current = null;
              }}
            >
              <div
                className="tm-ghost tm-ghost-2"
                style={{ '--tm-card-bg': getCardBackground(currentIndex + 2) } as React.CSSProperties}
              />
              <div
                className="tm-ghost tm-ghost-1"
                style={{ '--tm-card-bg': getCardBackground(currentIndex + 1) } as React.CSSProperties}
              />
              <div className="tm-card-float">
                <div
                  key={`${currentIndex}-${cardRenderKey}`}
                  className="tm-card"
                  style={
                    {
                      '--tm-card-bg': getCardBackground(currentIndex),
                      '--tm-dx': `${direction * 28}px`,
                      '--tm-dr': `${direction * 3}deg`,
                    } as React.CSSProperties
                  }
                >
                  <span className="tm-badge">Day {activeCard.day}</span>
                  {isViewingToday && <span className="tm-today-chip">Today</span>}
                  <MotivationIllustration
                    sceneId={activeCard.sceneId}
                    bodyColor={getBeanBodyColor(currentIndex)}
                  />
                  <p className="tm-card-text">{activeCard.message}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="tm-nav-btn"
            onClick={handleNext}
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        <div className="tm-controls-row">
          <button type="button" className="tm-pill-btn" onClick={handleToday}>
            Go to today
          </button>
          <button type="button" className="tm-pill-btn" onClick={handleSurpriseMe}>
            Surprise me
          </button>
        </div>

        <nav className="tm-days-nav" aria-label="Choose a day">
          <p className="tm-days-label">Choose a day</p>
          {MOTIVATION_CARDS.map((card, idx) => (
            <button
              key={card.day}
              type="button"
              className="tm-day-btn"
              aria-label={`Day ${card.day}`}
              aria-current={idx === currentIndex ? 'true' : undefined}
              onClick={() => showDay(idx, idx >= currentIndex ? 1 : -1)}
            >
              {card.day}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
