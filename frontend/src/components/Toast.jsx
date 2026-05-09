import { useEffect } from "react";

export default function Toast({ message, type = "error", onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`rounded-lg border border-border bg-white px-4 py-3 text-sm text-text-primary shadow-lg ${
          type === "error" ? "border-l-4 border-l-destructive" : ""
        }`}
        role="alert"
      >
        {message}
      </div>
    </div>
  );
}
