import { useState } from "react";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function MessageCard({ shortCode, onSent }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (skipMessage = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/invitations/by-code/${shortCode}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: skipMessage ? null : name.trim() || null,
            message: skipMessage ? null : message.trim() || null,
          }),
        }
      );

      if (res.ok) {
        onSent();
      } else {
        setError(t("errors.network"));
      }
    } catch {
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[400px] w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-text-primary text-center">
        {t("recipient.messageHeading")}
      </h2>
      <p className="text-base text-text-secondary mt-2 text-center">
        {t("recipient.messageSubheading")}
      </p>

      <div className="mt-6">
        <label
          htmlFor="recipient-name"
          className="text-sm font-medium text-text-primary mb-2 block"
        >
          {t("recipient.nameLabel")}
        </label>
        <input
          id="recipient-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder={t("recipient.namePlaceholder")}
          className="h-11 w-full rounded-lg border border-border px-3 text-base text-text-primary placeholder:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="recipient-message"
          className="text-sm font-medium text-text-primary mb-2 block"
        >
          {t("recipient.messageLabel")}
        </label>
        <input
          id="recipient-message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={30}
          placeholder={t("recipient.messagePlaceholder")}
          className="h-11 w-full rounded-lg border border-border px-3 text-base text-text-primary placeholder:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
        />
        <p className="text-sm text-text-secondary mt-1 text-right" aria-live="polite">
          {message.length}/30
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={() => handleSubmit(false)}
        disabled={loading}
        className="mt-6 h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:scale-[1.02] transition-transform disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t("recipient.sending") : t("recipient.send")}
      </button>

      <p
        className="mt-3 text-sm text-text-secondary text-center cursor-pointer hover:text-text-primary"
        onClick={() => !loading && handleSubmit(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!loading) handleSubmit(true);
          }
        }}
      >
        {t("recipient.skip")}
      </p>
    </div>
  );
}
