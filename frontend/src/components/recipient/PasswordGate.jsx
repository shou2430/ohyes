import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function PasswordGate({ title, shortCode, onVerified }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(
        `${API_URL}/api/invitations/by-code/${shortCode}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        onVerified(data);
      } else {
        setError(true);
        setShakeKey((k) => k + 1);
      }
    } catch {
      setError(true);
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-[360px] text-center">
        <h1 className="text-2xl font-semibold text-text-primary line-clamp-2">
          {title}
        </h1>
        <p className="mt-3 text-base text-text-secondary">
          {t("recipient.passwordInstruction")}
        </p>
        <form onSubmit={handleSubmit}>
          <motion.div
            key={shakeKey}
            animate={
              error
                ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                : { x: 0 }
            }
            transition={
              error
                ? { type: "spring", stiffness: 600, damping: 15, mass: 0.5 }
                : {}
            }
          >
            <label htmlFor="password-input" className="sr-only">
              {t("recipient.passwordPlaceholder")}
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder={t("recipient.passwordPlaceholder")}
              className={`mt-6 h-11 w-full rounded-lg border px-4 text-center text-base tracking-widest text-text-primary outline-none transition-colors placeholder:tracking-normal placeholder:text-text-secondary ${
                error
                  ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                  : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
              }`}
            />
          </motion.div>
          {error && (
            <p className="mt-2 text-sm text-destructive" aria-live="assertive">
              {t("recipient.wrongPassword")}
            </p>
          )}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="mt-4 h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("recipient.unlock")}
          >
            {loading ? "..." : t("recipient.unlock")}
          </button>
        </form>
      </div>
    </div>
  );
}
