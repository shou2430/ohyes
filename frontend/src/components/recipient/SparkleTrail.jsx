import { motion, AnimatePresence } from "motion/react";

const STAR_CLIP_PATH =
  "polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)";

export default function SparkleTrail({ particles }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ willChange: "transform, opacity" }}
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{
              opacity: { duration: 0.1 },
              exit: { duration: 0.6, delay: 0.3 },
            }}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              clipPath: STAR_CLIP_PATH,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
