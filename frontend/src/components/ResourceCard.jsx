import { useNavigate } from "react-router-dom";
import { MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResourceCard({ resource }) {
  const navigate = useNavigate();

  // Compute slot status from time_slots array
  const slots = resource.time_slots || [];
  const availableSlots = slots.filter((s) => s.status === "available").length;
  const totalSlots = slots.length;

  let badge = "available";
  let badgeLabel = "Available";
  if (availableSlots === 0) {
    badge = "booked";
    badgeLabel = "Fully Booked";
  } else if (availableSlots <= 2 && totalSlots > 2) {
    badge = "limited";
    badgeLabel = `${availableSlots} slot${availableSlots > 1 ? "s" : ""} left`;
  }

  const inst = resource.institutions;
  const rate = resource.hourly_rate_algo;
  const rateDisplay = rate != null ? `${rate} ALGO/hr` : "Rate TBD";

  return (
    <div
      className="card listing-card accent-tick"
      onClick={() => navigate(`/booking/${resource.id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="row">
        <span className={`badge badge-${badge}`}>{badgeLabel}</span>
        <span className="rate">{rateDisplay}</span>
      </div>
      <h3>{resource.name}</h3>
      <div className="inst">
        {inst ? inst.name : "Unknown Institution"}
        {resource.facility_name && ` — ${resource.facility_name}`}
      </div>
      <div className="card-tags">
        {resource.category && <span className="tag">{resource.category}</span>}
        {resource.operator_required && <span className="tag">Operator included</span>}
        {inst?.is_verified && <span className="tag tag-verified"><CheckCircle size={11} /> Verified</span>}
      </div>
      <div className="meta">
        {badge === "booked" ? (
          <><Clock size={14} /> Next opening soon</>
        ) : (
          <><CheckCircle size={14} /> {availableSlots} slot{availableSlots !== 1 ? "s" : ""} available</>
        )}
      </div>
    </div>
  );
}
