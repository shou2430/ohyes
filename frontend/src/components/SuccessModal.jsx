import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";

export default function SuccessModal({ shareUrl, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const copyBtnRef = useRef(null);

  const handleDismiss = useCallback(() => {
    onClose();
    navigate("/dashboard");
  }, [onClose, navigate]);

  // Focus copy button on open
  useEffect(() => {
    copyBtnRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleDismiss]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed — silently ignore for modal
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <div className="flex flex-col items-center">
          <CheckCircle size={48} className="text-accent" />
          <h2 className="mt-4 text-center text-xl font-semibold text-text-primary">
            {t("create.successHeading")}
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {t("create.successBody")}
          </p>
          <div className="mt-4 w-full break-all rounded-lg bg-cream p-3 text-center font-mono text-sm text-text-primary">
            {shareUrl}
          </div>
          <button
            ref={copyBtnRef}
            onClick={handleCopy}
            className="mt-4 h-11 w-full rounded-lg bg-accent text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          >
            {copied ? t("dashboard.copied") : t("create.copyLink")}
          </button>
          <button
            onClick={handleDismiss}
            className="mt-3 cursor-pointer text-center text-sm text-text-secondary hover:text-text-primary"
          >
            {t("create.backToDashboard")}
          </button>
        </div>
      </div>
    </div>
  );
}
