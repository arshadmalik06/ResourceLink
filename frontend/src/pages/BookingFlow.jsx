import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchResourceById, requestBooking, finalizeBooking } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import SlotPicker from "../components/SlotPicker.jsx";
import {
  CheckCircle, Clock, MapPin, Shield, ArrowRight,
  CreditCard, FileText, User, Building2, Tag
} from "lucide-react";

import { connectWallet, sendPaymentTransaction } from "../lib/algorand.js";

// Receiver wallet from backend env
const ALGORAND_RECEIVER_WALLET = "E72ZSVBMJQRJTNKDVODQKPM4UBVNN4PZH6EOWVOZARTQ5ZZ2CVAJP3T4AY";

const STEPS = ["Select Slot", "Enter Details", "Confirm Booking"];

export default function BookingFlow() {
  const { resourceId } = useParams();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking flow state
  const [step, setStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [researcherName, setResearcherName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    if (!resourceId || resourceId === "select") return;
    setLoading(true);
    fetchResourceById(resourceId)
      .then((data) => setResource(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resourceId]);

  // No resource ID provided — show a prompt
  if (resourceId === "select") {
    return (
      <div className="page-wrap">
        <div className="wrap page-head">
          <h1>Reserve a Resource</h1>
          <p>Start by finding equipment on the Discover page or running an AI match.</p>
        </div>
        <section>
          <div className="wrap" style={{ display: "flex", gap: "16px" }}>
            <Link to="/discover" className="btn btn-primary">Browse Resources</Link>
            <Link to="/match" className="btn btn-outline">AI Match</Link>
          </div>
        </section>
      </div>
    );
  }

  if (loading) return <div className="page-wrap"><div className="wrap" style={{ paddingTop: "60px" }}><LoadingSpinner message="Loading resource details…" /></div></div>;
  if (error) return <div className="page-wrap"><div className="wrap" style={{ paddingTop: "60px" }}><ErrorMessage message={error} /></div></div>;
  if (!resource) return null;

  const inst = resource.institutions;
  const slots = resource.time_slots || [];

  function formatSlotTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
    });
  }

  function durationHours(start, end) {
    if (!start || !end) return 0;
    return Math.round((new Date(end) - new Date(start)) / 3600000 * 10) / 10;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setBookingError(null);

    try {
      // 1. Request Booking (Phase 1)
      let pendingBooking;
      try {
        const result = await requestBooking({
          slotId: selectedSlot.id,
          purpose,
          researcherName,
          token: null, // No auth in demo mode
        });
        pendingBooking = result.booking;
      } catch (err) {
        // Fallback for demo if auth fails
        pendingBooking = {
          id: crypto.randomUUID(),
          slot_id: selectedSlot.id,
          purpose_statement: purpose,
          researcher_name: researcherName,
          approval_status: "pending_approval",
        };
      }

      // 2. Payment Flow (Phase 2)
      setBookingError("Connecting to Pera Wallet...");
      const accountAddress = await connectWallet();
      if (!accountAddress) {
        throw new Error("Wallet connection failed or was cancelled.");
      }

      const cost = parseFloat(
        (resource.hourly_rate_algo * durationHours(selectedSlot.start_time, selectedSlot.end_time)).toFixed(2)
      );

      setBookingError(`Please approve the payment of ${cost} ALGO in Pera Wallet...`);
      const txId = await sendPaymentTransaction(accountAddress, ALGORAND_RECEIVER_WALLET, cost);

      setBookingError("Finalizing booking with transaction ID...");
      
      // 3. Finalize Booking
      const finalResult = await finalizeBooking({
        bookingId: pendingBooking.id,
        slotId: selectedSlot.id,
        txId,
        token: null,
      });

      setBookingResult({
        success: true,
        message: finalResult.message || "Booking confirmed securely on-chain!",
        booking: {
          ...pendingBooking,
          approval_status: "confirmed",
          algorand_tx_id: txId
        }
      });
      setBookingError(null);
      setStep(3); // Success step
    } catch (err) {
      setBookingError(err.message || "An error occurred during the booking process.");
    } finally {
      setSubmitting(false);
    }
  }

  const estimatedCost = selectedSlot
    ? (resource.hourly_rate_algo * durationHours(selectedSlot.start_time, selectedSlot.end_time)).toFixed(2)
    : "—";

  return (
    <div className="page-wrap" id="page-booking">
      <div className="wrap page-head">
        <h1>Book: {resource.name}</h1>
        <p>
          {inst?.name}
          {resource.facility_name && ` — ${resource.facility_name}`}
        </p>
      </div>

      {/* Stepper */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="stepper">
            {STEPS.map((label, i) => (
              <div key={i} className={`st ${step > i ? "done" : ""} ${step === i ? "current" : ""}`}>
                <div className="num">{step > i ? "✓" : i + 1}</div>
                <div className="lbl">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource summary card */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="card booking-summary">
            <div className="booking-summary-row">
              <div>
                <h3><Tag size={14} /> {resource.name}</h3>
                <div className="booking-detail"><Building2 size={14} /> {inst?.name || "Unknown"}</div>
                <div className="booking-detail"><MapPin size={14} /> {resource.facility_name || "—"}</div>
                {inst?.latitude && inst?.longitude && (
                  <div className="booking-detail"><MapPin size={14} /> {inst.latitude}°N, {inst.longitude}°E</div>
                )}
              </div>
              <div className="booking-cost">
                <div className="cost-label">Rate</div>
                <div className="cost-value">{resource.hourly_rate_algo} ALGO/hr</div>
                {selectedSlot && (
                  <>
                    <div className="cost-label" style={{ marginTop: "8px" }}>Estimated total</div>
                    <div className="cost-value">{estimatedCost} ALGO</div>
                  </>
                )}
              </div>
            </div>
            <div className="booking-tags">
              {resource.category && <span className="tag">{resource.category}</span>}
              {(resource.capability_tags || []).map((t, i) => (
                <span className="tag" key={i}>{t}</span>
              ))}
              {inst?.is_verified && <span className="tag tag-verified"><Shield size={11} /> Verified</span>}
              {resource.operator_required && <span className="tag">Operator included</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Step 0: Select slot */}
      {step === 0 && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <h2>Select a time slot</h2>
              <p>Choose from available windows for this resource.</p>
            </div>
            <SlotPicker
              slots={slots}
              selectedId={selectedSlot?.id}
              onSelect={(slot) => setSelectedSlot(slot)}
            />
            {selectedSlot && (
              <div style={{ marginTop: "20px" }}>
                <button className="btn btn-primary" onClick={() => setStep(1)}>
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 1: Enter details */}
      {step === 1 && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card" style={{ padding: "24px" }}>
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <h2>Booking Details</h2>
                <p>
                  Selected slot: {formatSlotTime(selectedSlot.start_time)} → {formatSlotTime(selectedSlot.end_time)}
                  ({durationHours(selectedSlot.start_time, selectedSlot.end_time)}h)
                </p>
              </div>
              <div className="field-block">
                <label><User size={14} /> Researcher name</label>
                <div className="field">
                  <input
                    placeholder="Dr. Full Name"
                    value={researcherName}
                    onChange={(e) => setResearcherName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field-block" style={{ marginTop: "16px" }}>
                <label><FileText size={14} /> Purpose statement</label>
                <div className="field" style={{ alignItems: "flex-start" }}>
                  <textarea
                    placeholder="Describe the experiment or analysis you plan to conduct…"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={4}
                    style={{
                      width: "100%", border: "none", outline: "none",
                      fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14px",
                      resize: "vertical", background: "transparent", color: "var(--ink)",
                    }}
                    required
                  ></textarea>
                </div>
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                <button className="btn btn-outline" onClick={() => setStep(0)}>Back</button>
                <button
                  className="btn btn-primary"
                  disabled={!researcherName.trim() || !purpose.trim()}
                  onClick={() => setStep(2)}
                >
                  Review booking <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card" style={{ padding: "24px" }}>
              <div className="section-head" style={{ marginBottom: "20px" }}>
                <h2>Confirm Your Booking</h2>
              </div>
              <div className="booking-review">
                <div className="review-row">
                  <span className="review-label">Resource</span>
                  <span>{resource.name}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Institution</span>
                  <span>{inst?.name}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Time slot</span>
                  <span>{formatSlotTime(selectedSlot.start_time)} → {formatSlotTime(selectedSlot.end_time)}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Duration</span>
                  <span>{durationHours(selectedSlot.start_time, selectedSlot.end_time)} hours</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Estimated cost</span>
                  <span className="cost-highlight">{estimatedCost} ALGO</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Researcher</span>
                  <span>{researcherName}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Purpose</span>
                  <span>{purpose}</span>
                </div>
              </div>
              <div className="booking-notice">
                <CreditCard size={16} />
                <span>
                  After submitting, the x402 protocol will require payment of <strong>{estimatedCost} ALGO</strong> on the Algorand Testnet before access is granted.
                </span>
              </div>
              {bookingError && <ErrorMessage message={bookingError} />}
              <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? "Submitting…" : "Submit Booking Request"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Success */}
      {step === 3 && bookingResult && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card booking-success">
              <div className="success-icon"><CheckCircle size={48} /></div>
              <h2>Booking Request Submitted!</h2>
              <p>{bookingResult.message}</p>
              <div className="booking-review" style={{ marginTop: "16px" }}>
                <div className="review-row">
                  <span className="review-label">Booking ID</span>
                  <span className="mono">{bookingResult.booking?.id?.slice(0, 8) || "—"}…</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Status</span>
                  <span className="badge badge-limited">{bookingResult.booking?.approval_status || "Pending"}</span>
                </div>
              </div>
              <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center" }}>
                <Link to="/payment" className="btn btn-primary">
                  Proceed to Payment <ArrowRight size={14} />
                </Link>
                <Link to="/discover" className="btn btn-outline">Browse more</Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
