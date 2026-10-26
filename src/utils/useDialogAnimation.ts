/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to manage smooth enter and exit transitions for UI modals and dialogs.
 * Ensures the dialog doesn't unmount abruptly, but plays the exit animation before removal.
 */
export function useDialogAnimation(isOpen: boolean, onClose: () => void, durationMs = 220) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let animFrame: number | null = null;

    if (isOpen) {
      isClosingRef.current = false;
      setIsRendered(true);
      // Double rAF or short timeout guarantees the browser renders the initial mounted state before applying active transition
      animFrame = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 16);
      });
    } else {
      if (isRendered && !isClosingRef.current) {
        isClosingRef.current = true;
        setIsVisible(false);
        timer = setTimeout(() => {
          setIsRendered(false);
          isClosingRef.current = false;
        }, durationMs);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isOpen, isRendered, durationMs]);

  const triggerClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsVisible(false);
    setTimeout(() => {
      setIsRendered(false);
      isClosingRef.current = false;
      onClose();
    }, durationMs);
  }, [onClose, durationMs]);

  return {
    isRendered,
    isClosing: !isVisible,
    triggerClose,
    backdropClass: `m3-dialog-backdrop ${isVisible ? 'entering' : 'exiting'}`,
    dialogClass: `m3-dialog-surface ${isVisible ? 'entering' : 'exiting'}`,
  };
}
