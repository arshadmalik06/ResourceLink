export default function LoadingSpinner({ message = "Loading…" }) {
  return (
    <div className="loading-container">
      <div className="spinner-ring">
        <div></div><div></div><div></div>
      </div>
      <p className="loading-text">{message}</p>
    </div>
  );
}

export function SkeletonCard({ count = 3 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card skeleton-card" key={i}>
          <div className="skel skel-badge"></div>
          <div className="skel skel-title"></div>
          <div className="skel skel-line"></div>
          <div className="skel skel-line short"></div>
        </div>
      ))}
    </div>
  );
}
