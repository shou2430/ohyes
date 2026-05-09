import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Link, Check, Trash2 } from "lucide-react";

export default function InvitationCard({ invitation, onDelete, onCopyError }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(invitation.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    )
  );

  const createdDate = new Date(invitation.created_at).toLocaleDateString();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitation.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyError?.();
    }
  };

  const handleDelete = () => {
    if (window.confirm(t("dashboard.deleteConfirm"))) {
      onDelete(invitation.id);
    }
  };

  const maskedPassword = "\u2022".repeat(invitation.password.length);

  return (
    <div className="rounded-lg border border-border bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        {/* Row 1 — Title */}
        <h3 className="truncate text-xl font-semibold text-text-primary">
          {invitation.title}
        </h3>

        {/* Row 2 — Metadata */}
        <p className="text-sm text-text-secondary">
          {createdDate} — {t("dashboard.daysRemaining", { count: daysRemaining })}
        </p>

        {/* Row 3 — Password */}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>{t("dashboard.passwordLabel")}</span>
          <span>{showPassword ? invitation.password : maskedPassword}</span>
          <button
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Row 4 — Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleCopyLink}
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-primary hover:bg-stone-50"
            aria-live="polite"
          >
            {copied ? <Check size={16} /> : <Link size={16} />}
            {copied ? t("dashboard.copied") : t("dashboard.copyLink")}
          </button>
          <button
            onClick={handleDelete}
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-destructive px-4 text-sm font-medium text-destructive hover:bg-red-50"
          >
            <Trash2 size={16} />
            {t("dashboard.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
