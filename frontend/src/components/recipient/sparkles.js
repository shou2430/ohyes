/**
 * Spawn sparkle particles along the path between old and new button positions.
 * Kept in its own module (not SparkleTrail.jsx) so the component file only
 * exports a component — satisfies react-refresh/only-export-components.
 *
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
