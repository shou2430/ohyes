import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import NotificationRow from "./NotificationRow";

export default function NotificationPanel({ notifications, highlightedIds }) {
  const { t } = useTranslation();
  const scrollRegionRef = useRef(null);

  const highlightedSet = useMemo(
    () => new Set(highlightedIds),
    [highlightedIds]
  );

  // The panel only mounts while open, so focusing here on every mount
  // satisfies "focus on open moves to the panel scroll region" for every
  // open, not just the first.
  useEffect(() => {
    scrollRegionRef.current?.focus();
  }, []);

  return (
    <div
      id="notification-panel"
      className="fixed left-4 right-4 top-[72px] z-40 origin-top overflow-hidden rounded-xl border border-border bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:origin-top-right"
    >
      <div className="sticky top-0 border-b border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary">
        {t("notifications.title")}
      </div>

      <div
        ref={scrollRegionRef}
        tabIndex={0}
        role="region"
        aria-label={t("notifications.title")}
        className="max-h-[70vh] overflow-y-auto overscroll-contain divide-y divide-border sm:max-h-[420px]"
      >
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Heart
              size={32}
              className="mx-auto text-border"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-semibold text-text-primary">
              {t("notifications.emptyHeading")}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("notifications.emptyBody")}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              isHighlighted={highlightedSet.has(n.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
