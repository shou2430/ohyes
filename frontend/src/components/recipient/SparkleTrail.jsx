import { motion, AnimatePresence } from "motion/react";

const STAR_CLIP_PATH =
  "polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)";

/**
 * Spawn sparkle particles along the path between old and new button positions.
 * @param {number} oldX - Start X position
 * @param {number} oldY - Start Y position
 * @param {number} newX - End X position
 * @param {number} newY - End Y position
 * @param {number} stageIndex - 0-indexed stage (sparkles start at stage 1 = Nervous)
 * @returns {Array} Array of particle objects { id, x, y, size, color }
 */
export function spawnSparkles(oldX, oldY, newX, newY, stageIndex) {
  const counts = [0, 4, 7, 10, 14];
  const count = counts[Math.min(stageIndex, 4)] || 0;
  if (count === 0) return [];

  const particles = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const x = oldX + (newX - oldX) * t + (Math.random() - 0.5) * 40;
    const y = oldY + (newY - oldY) * t + (Math.random() - 0.5) * 40;
    const size = 6 + Math.random() * 8; // 6-14px
    const color = Math.random() < 0.6 ? "#FBBF24" : "#FFFFFF";
    particles.push({
      id: `${Date.now()}-${i}-${Math.random()}`,
      x,
      y,
      size,
      color,
    });
  }
  return particles;
}

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
