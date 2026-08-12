import { useTranslation } from "react-i18next";

function formatRelativeTime(isoString, language) {
  const then = new Date(isoString);
  const now = new Date();
  const diffMs = now - then;
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 60) {
    return null; // caller renders notifications.justNow instead
  }

  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return rtf.format(-diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return rtf.format(-diffDays, "day");
  }
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  }).format(then);
}

export default function NotificationRow({ notification, isHighlighted }) {
  const { t, i18n } = useTranslation();

  const hasName =
    typeof notification.recipient_name === "string" &&
    notification.recipient_name.length > 0;
  const hasMessage =
    typeof notification.recipient_message === "string" &&
    notification.recipient_message.length > 0;

  const sentence = hasName
    ? t("notifications.saidYes", {
        name: notification.recipient_name,
        title: notification.invitation_title,
      })
    : t("notifications.saidYesAnonymous", {
        title: notification.invitation_title,
      });

  const relativeLabel = formatRelativeTime(
    notification.created_at,
    i18n.language
  );
  const absoluteLocalString = new Date(
    notification.created_at
  ).toLocaleString(i18n.language);

  return (
    <div
      className={`border-l-2 px-4 py-3 ${
        isHighlighted
          ? "border-l-accent bg-cream"
          : "border-l-transparent bg-white"
      }`}
    >
      <p className="text-sm text-text-primary">
        {isHighlighted && (
          <span className="sr-only">{t("notifications.newLabel")} </span>
        )}
        {sentence}
      </p>

      {hasMessage && (
        <div className="mt-2 border-l-2 border-border pl-3 text-sm text-text-secondary">
          {notification.recipient_message}
        </div>
      )}

      <time
        className="mt-2 block text-sm text-text-secondary"
        dateTime={notification.created_at}
        title={absoluteLocalString}
      >
        {relativeLabel ?? t("notifications.justNow")}
      </time>
    </div>
  );
}
