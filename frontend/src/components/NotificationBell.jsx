import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell({ notifications, onMarkRead }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const showDot = unreadCount > 0 && !open;

  // One-shot bounce (D-16): fires only on the 0 -> >0 transition, never on
  // every poll tick and never when the count merely grows (e.g. 1 -> 2).
  const prevUnreadCount = useRef(unreadCount);
  const [bounceKey, setBounceKey] = useState(0);
  useEffect(() => {
    if (prevUnreadCount.current === 0 && unreadCount > 0) {
      setBounceKey((k) => k + 1);
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  // Opening the panel: snapshot the highlight set *before* the mark-read
  // call (D-09), then optimistically clear the dot by firing onMarkRead,
  // which flips is_read locally in DashboardPage.
  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const snapshot = notifications
          .filter((n) => !n.is_read)
          .map((n) => n.id);
        setHighlightedIds(snapshot);
        onMarkRead?.();
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        close();
      }
    }

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        close();
      }
    }

    function handleFocusOut(event) {
      const nextTarget = event.relatedTarget;
      if (!nextTarget || !wrapperRef.current?.contains(nextTarget)) {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    const wrapper = wrapperRef.current;
    wrapper?.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      wrapper?.removeEventListener("focusout", handleFocusOut);
    };
  }, [open]);

  const ariaLabel =
    unreadCount > 0
      ? t("notifications.ariaLabel", { unread: unreadCount })
      : t("notifications.ariaLabelNone");

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-cream hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <motion.span
          key={bounceKey}
          className="inline-flex"
          animate={
            prefersReducedMotion ? {} : { scale: [1, 1.25, 0.92, 1.08, 1] }
          }
          transition={{
            duration: 0.6,
            ease: "easeOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <Heart
            size={20}
            className={
              open
                ? "text-text-primary"
                : unreadCount > 0
                  ? "text-accent"
                  : "text-text-secondary"
            }
          />
        </motion.span>
        {showDot && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white"
          />
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          highlightedIds={highlightedIds}
        />
      )}
    </div>
  );
}
