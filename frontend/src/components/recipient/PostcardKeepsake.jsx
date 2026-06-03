import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function PostcardKeepsake({ invitation, cachedPhotoUrl }) {
  const { t } = useTranslation();
  const postcardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(postcardRef.current, {
        useCORS: true,
        scale: 2,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ohyes-postcard.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch {
      // Silently fail — download is optional
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-[400px] w-full text-center">
      {/* Postcard */}
      <div
        ref={postcardRef}
        className="bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <img
          src={cachedPhotoUrl || `${API_URL}${invitation.photo_url}`}
          alt={invitation.title}
          className="w-full aspect-[4/3] object-cover"
          crossOrigin="anonymous"
        />
        <div className="p-6">
          <h2 className="text-xl font-semibold text-text-primary">
            {invitation.title}
          </h2>
          <div className="mt-3 mx-auto w-16 h-0.5 bg-border rounded-full" />
          <p className="mt-3 text-base text-text-secondary" style={{ fontFamily: "'Long Cang', 'Caveat', cursive" }}>
            {t("recipient.postcardStamp")}
          </p>
        </div>
      </div>

      {/* Download button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-6 h-11 px-6 rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-stone-50 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
        aria-label={t("recipient.saveImage")}
      >
        <Download size={16} />
        {t("recipient.saveImage")}
      </button>

      {/* Close text */}
      <p className="mt-4 text-sm text-text-secondary">
        {t("recipient.autoClose")}
      </p>
    </div>
  );
}
