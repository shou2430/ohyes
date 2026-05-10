import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";

const STAGES = [
  { min: 0, max: 2, stiffness: 200, damping: 20, distMin: 60, distMax: 80, wobble: 0 },
  { min: 3, max: 5, stiffness: 350, damping: 15, distMin: 100, distMax: 140, wobble: 0 },
  { min: 6, max: 9, stiffness: 500, damping: 12, distMin: 160, distMax: 200, wobble: 0 },
  { min: 10, max: 14, stiffness: 700, damping: 10, distMin: 200, distMax: 260, wobble: 3 },
  { min: 15, max: Infinity, stiffness: 900, damping: 8, distMin: 0, distMax: 0, wobble: 5 },
];

const STAGE5_TEXTS = ["noWait", "noPlease", "noGiveUp", "noFine"];
const PADDING = 16;

function getStage(count) {
  return STAGES.find((s) => count >= s.min && count <= s.max) || STAGES[4];
}

function getStageIndex(count) {
  return STAGES.findIndex((s) => count >= s.min && count <= s.max);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function checkIsMobile() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}

export default function NoButton({ onDodge, dodgeCount, containerRef }) {
  const { t } = useTranslation();
  const buttonRef = useRef(null);
  const [isDodging, setIsDodging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [wobbleKey, setWobbleKey] = useState(0);
  const [ghostBlock, setGhostBlock] = useState(false);
  const [scale, setScale] = useState(1);

  const stage = getStage(dodgeCount);
  const stageIndex = getStageIndex(dodgeCount);

  const getButtonText = useCallback(() => {
    if (stageIndex < 4) return t("recipient.no");
    const textIndex = (dodgeCount - 15) % STAGE5_TEXTS.length;
    const idx = textIndex < 0 ? 0 : textIndex;
    return t(`recipient.${STAGE5_TEXTS[idx]}`);
  }, [dodgeCount, stageIndex, t]);

  const handleDodge = useCallback(
    (e) => {
      if (ghostBlock) return;

      // Prevent touch from triggering click
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();

      const button = buttonRef.current;
      const container = containerRef?.current;
      if (!button || !container) return;

      const btnRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;

      // Get pointer position
      let pointerX, pointerY;
      if (e?.touches && e.touches.length > 0) {
        pointerX = e.touches[0].clientX;
        pointerY = e.touches[0].clientY;
      } else if (e?.clientX !== undefined) {
        pointerX = e.clientX;
        pointerY = e.clientY;
      } else {
        // Fallback: use button center offset
        pointerX = btnCenterX - 20;
        pointerY = btnCenterY - 20;
      }

      const oldX = pos.x;
      const oldY = pos.y;

      let newX, newY;

      if (stageIndex >= 4) {
        // Stage 5: random teleport within viewport
        const maxX = containerRect.width - btnRect.width - PADDING * 2;
        const maxY = containerRect.height - btnRect.height - PADDING * 2;
        newX = PADDING + Math.random() * maxX;
        newY = PADDING + Math.random() * maxY;
      } else {
        // Compute escape direction: button center - pointer position
        let dx = btnCenterX - pointerX;
        let dy = btnCenterY - pointerY;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
          dx /= len;
          dy /= len;
        } else {
          // Random direction if pointer is exactly at center
          const angle = Math.random() * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
        }

        // Add random angular offset +/-30 degrees
        const offsetAngle = ((Math.random() - 0.5) * 60 * Math.PI) / 180;
        const cos = Math.cos(offsetAngle);
        const sin = Math.sin(offsetAngle);
        const rotDx = dx * cos - dy * sin;
        const rotDy = dx * sin + dy * cos;

        const distance = randomInRange(stage.distMin, stage.distMax);
        const targetX = btnCenterX + rotDx * distance - containerRect.left - btnRect.width / 2;
        const targetY = btnCenterY + rotDy * distance - containerRect.top - btnRect.height / 2;

        // Clamp to viewport bounds
        newX = clamp(targetX, PADDING, containerRect.width - btnRect.width - PADDING);
        newY = clamp(targetY, PADDING, containerRect.height - btnRect.height - PADDING);
      }

      if (!isDodging) {
        setIsDodging(true);
      }

      setPos({ x: newX, y: newY });

      // Scale effect for stage 3+
      if (stageIndex >= 2) {
        setScale(0.95);
        setTimeout(() => setScale(1), 150);
      }

      // Wobble for stages 4-5
      if (stage.wobble > 0) {
        setWobbleKey((k) => k + 1);
      }

      // Ghost click prevention
      setGhostBlock(true);
      setTimeout(() => setGhostBlock(false), 150);

      // Notify parent with old and new positions for sparkle spawning
      if (onDodge) {
        onDodge({
          oldX: isDodging ? oldX : btnCenterX - containerRect.left,
          oldY: isDodging ? oldY : btnCenterY - containerRect.top,
          newX,
          newY,
          stageIndex,
        });
      }
    },
    [ghostBlock, containerRef, pos, isDodging, stageIndex, stage, onDodge]
  );

  const wobbleDeg = stage.wobble;
  const wobbleAnimation =
    wobbleDeg > 0
      ? {
          rotate: [0, wobbleDeg, -wobbleDeg, wobbleDeg / 2, -wobbleDeg / 2, 0],
        }
      : {};

  const springTransition = checkIsMobile()
    ? { type: "tween", duration: 0.15 }
    : { type: "spring", stiffness: stage.stiffness, damping: stage.damping, mass: 1 };

  if (!isDodging) {
    return (
      <motion.button
        ref={buttonRef}
        className="h-12 px-8 rounded-xl bg-white border border-border text-base font-semibold text-text-primary shadow-sm transition-all"
        onHoverStart={handleDodge}
        onTouchStart={handleDodge}
        style={{ pointerEvents: ghostBlock ? "none" : "auto" }}
      >
        {getButtonText()}
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      className="h-12 px-8 rounded-xl bg-white border border-border text-base font-semibold text-text-primary shadow-sm transition-all absolute z-10"
      animate={{
        left: pos.x,
        top: pos.y,
        scale,
        ...wobbleAnimation,
      }}
      transition={springTransition}
      onHoverStart={handleDodge}
      onTouchStart={handleDodge}
      style={{ pointerEvents: ghostBlock ? "none" : "auto" }}
      key={`wobble-${wobbleKey}`}
    >
      {getButtonText()}
    </motion.button>
  );
}
