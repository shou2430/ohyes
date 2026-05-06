export default function LoadingSpinner({ size = 24 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-accent border-t-transparent"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
