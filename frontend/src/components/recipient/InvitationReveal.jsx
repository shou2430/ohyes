import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import NoButton from "./NoButton";
import DodgeCounter from "./DodgeCounter";
import LoadingSpinner from "../LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function InvitationReveal({ invitation, onYesClick }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const handleDodge = useCallback(() => {
    setDodgeCount((c) => c + 1);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-cream overflow-hidden"
    >
      {/* Content layer */}
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="max-w-[400px] w-full relative z-20">
          <h1 className="text-2xl font-semibold text-text-primary text-center line-clamp-2">
            {invitation.title}
          </h1>

          {/* Photo */}
          <div className="mt-6 w-full rounded-xl overflow-hidden shadow-md aspect-[4/3] bg-cream relative">
            {!photoLoaded && !photoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-100 animate-pulse">
                <LoadingSpinner />
              </div>
            )}
            {photoError && (
              <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm">
                ❌
              </div>
            )}
            <img
              src={`${API_URL}${invitation.photo_url}`}
              alt={invitation.title}
              crossOrigin="anonymous"
              fetchPriority="high"
              decoding="async"
              className={`w-full object-cover aspect-[4/3] ${
                photoLoaded ? "opacity-100" : "opacity-0"
              } transition-opacity`}
              onLoad={() => setPhotoLoaded(true)}
              onError={() => setPhotoError(true)}
            />
          </div>

          {/* Button row */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <motion.button
              className="h-12 px-8 rounded-xl bg-accent text-base font-semibold text-white shadow-sm hover:scale-[1.03] active:scale-[0.98] transition-transform"
              whileTap={{ scale: 0.9 }}
              onClick={onYesClick}
            >
              {t("recipient.yes")}
            </motion.button>
            <NoButton
              onDodge={handleDodge}
              dodgeCount={dodgeCount}
              containerRef={containerRef}
            />
          </div>

          {/* Dodge counter */}
          <DodgeCounter count={dodgeCount} />
        </div>
      </div>
    </div>
  );
}
