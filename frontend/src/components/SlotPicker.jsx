import { Clock, CheckCircle, XCircle } from "lucide-react";

function formatTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function durationHours(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 3600000 * 10) / 10;
}

export default function SlotPicker({ slots = [], selectedId, onSelect }) {
  const available = slots.filter((s) => s.status === "available");
  const sorted = [...available].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time)
  );

  if (sorted.length === 0) {
    return (
      <div className="slot-picker-empty">
        <XCircle size={20} />
        <p>No available slots for this resource right now.</p>
      </div>
    );
  }

  return (
    <div className="slot-picker">
      {sorted.map((slot) => {
        const hours = durationHours(slot.start_time, slot.end_time);
        const isSelected = selectedId === slot.id;
        return (
          <button
            key={slot.id}
            className={`slot-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(slot)}
          >
            <div className="slot-time">
              <Clock size={14} />
              <span>{formatTime(slot.start_time)}</span>
            </div>
            <div className="slot-time">
              <span className="slot-arrow">→</span>
              <span>{formatTime(slot.end_time)}</span>
            </div>
            <div className="slot-duration">{hours}h session</div>
            {isSelected && (
              <div className="slot-check"><CheckCircle size={16} /></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
