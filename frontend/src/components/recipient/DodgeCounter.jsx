import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";

function getLabel(count, t) {
  if (count <= 0) return "";
  if (count === 1) return t("recipient.dodge_one");
  if (count <= 5) return t("recipient.dodge_other");
  if (count <= 9) return t("recipient.dodgesExcited");
  if (count <= 14) return t("recipient.dodgesCantSayNo");
  return t("recipient.dodgesUnstoppable");
}

export default function DodgeCounter({ count }) {
  const { t } = useTranslation();

  if (count <= 0) return null;

  return (
    <div
      className="mt-6 flex flex-wrap items-center justify-center gap-2"
      aria-live="polite"
    >
      <AnimatePresence>
        <motion.span
          key={count}
          className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-accent text-white text-sm font-semibold"
          initial={count === 1 ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={
            count === 1
              ? { type: "spring", stiffness: 400, damping: 15 }
              : { duration: 0.2 }
          }
        >
          {count}
        </motion.span>
      </AnimatePresence>
      <span className="text-sm text-text-secondary text-center">{getLabel(count, t)}</span>
    </div>
  );
}
