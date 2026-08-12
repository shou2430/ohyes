import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell({ notifications }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const showDot = unreadCount > 0 && !open;

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
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
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-cream hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
        {showDot && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white"
          />
        )}
      </button>

      {open && <NotificationPanel notifications={notifications} />}
    </div>
  );
}
