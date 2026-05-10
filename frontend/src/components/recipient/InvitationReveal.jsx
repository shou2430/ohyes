import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import NoButton from "./NoButton";
import DodgeCounter from "./DodgeCounter";
import SparkleTrail, { spawnSparkles } from "./SparkleTrail";
import LoadingSpinner from "../LoadingSpinner";

const API_URL = import.meta.env.VITE_API_URL || "";
const MAX_PARTICLES = 40;
const PARTICLE_LIFETIME = 900;

export default function InvitationReveal({ invitation, onYesClick }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [particles, setParticles] = useState([]);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  const handleDodge = useCallback(
    ({ oldX, oldY, newX, newY, stageIndex }) => {
      setDodgeCount((c) => c + 1);

      // Spawn sparkles along the dodge path
      const newParticles = spawnSparkles(oldX, oldY, newX, newY, stageIndex);
      if (newParticles.length > 0) {
        setParticles((prev) => {
          const combined = [...prev, ...newParticles];
          // Cap at MAX_PARTICLES
          return combined.slice(-MAX_PARTICLES);
        });

        // Clean up particles after lifetime
        setTimeout(() => {
          const ids = new Set(newParticles.map((p) => p.id));
          setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
        }, PARTICLE_LIFETIME);
      }
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-cream overflow-hidden"
    >
      {/* Sparkle particles layer */}
      <SparkleTrail particles={particles} />

      {/* Content layer */}
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="max-w-[400px] w-full relative z-20">
          <h1 className="text-2xl font-semibold text-text-primary text-center line-clamp-2">
            {invitation.title}
          </h1>

          {/* Photo */}
          <div className="mt-6 w-full rounded-xl overflow-hidden shadow-md aspect-[4/3] bg-cream">
            {!photoLoaded && (
              <div className="flex items-center justify-center w-full h-full">
                <LoadingSpinner />
              </div>
            )}
            <img
              src={`${API_URL}${invitation.photo_url}`}
              alt={invitation.title}
              className={`w-full rounded-xl object-cover aspect-[4/3] shadow-md ${
                photoLoaded ? "" : "hidden"
              }`}
              onLoad={() => setPhotoLoaded(true)}
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
