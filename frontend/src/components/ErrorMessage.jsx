import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorMessage({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="error-container">
      <div className="error-icon">
        <AlertTriangle size={28} />
      </div>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
