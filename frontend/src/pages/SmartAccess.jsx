import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchBookings } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import {
  Key, QrCode, Clock, CheckCircle, ShieldCheck,
  Copy, ExternalLink, ArrowRight
} from "lucide-react";

function generateAccessKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts = [4, 4].map(() =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return `RL-${parts.join("-")}`;
}

export default function SmartAccess() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings()
      .then((data) => setBookings(data || []))
      .catch((err) => console.error("Failed to fetch bookings:", err))
      .finally(() => setLoading(false));
  }, []);

  const confirmed = bookings.filter((b) => b.approval_status === "confirmed");
  const pending = bookings.filter((b) => b.approval_status === "pending_approval");

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="page-wrap" id="page-access">
      <div className="wrap page-head">
        <h1>Smart Access</h1>
        <p>Once payment clears, credentials unlock automatically — no manual approval step on either side.</p>
      </div>

      {loading ? (
        <section><div className="wrap"><LoadingSpinner message="Loading access credentials…" /></div></section>
      ) : confirmed.length === 0 && pending.length === 0 ? (
        <section>
          <div className="wrap">
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <Key size={40} style={{ color: "var(--muted)", marginBottom: "16px" }} />
              <h3 style={{ marginBottom: "8px" }}>No active sessions</h3>
              <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
                Book a resource to get access credentials.
              </p>
              <Link to="/discover" className="btn btn-primary">
                Reserve Capacity <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            {/* Confirmed bookings — access cards */}
            {confirmed.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Active Access Credentials</h2>
                  <p>Confirmed bookings with issued access.</p>
                </div>
                <div className="access-grid">
                  {confirmed.map((b) => {
                    const resource = b.time_slots?.resources;
                    const slot = b.time_slots;
                    const accessKey = generateAccessKey();

                    return (
                      <div className="card access-card" key={b.id}>
                        <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                            {resource?.name || "Resource"}
                          </h3>
                          <span className="badge badge-available">
                            <CheckCircle size={11} /> Unlocked
                          </span>
                        </div>
                        <div className="key">{accessKey}</div>
                        <div className="access-meta">
                          <span>Session window</span>
                          <strong>{formatTime(slot?.start_time)} – {formatTime(slot?.end_time)}</strong>
                        </div>
                        <div className="access-meta">
                          <span>Researcher</span>
                          <strong>{b.researcher_name || "—"}</strong>
                        </div>
                        {b.algorand_tx_id && (
                          <div className="access-meta">
                            <span>Algorand Tx</span>
                            <a
                              href={`https://testnet.explorer.perawallet.app/tx/${b.algorand_tx_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tx-link"
                              style={{ fontSize: "12px" }}
                            >
                              {b.algorand_tx_id.slice(0, 16)}… <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                        <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(accessKey)}>
                            <Copy size={12} /> Copy key
                          </button>
                          <Link to="/tracking" className="btn btn-outline btn-sm">
                            View usage
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pending bookings */}
            {pending.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: "32px" }}>
                  <h2>Pending Bookings</h2>
                  <p>Awaiting payment or approval.</p>
                </div>
                <div className="card">
                  <table className="forecast-table">
                    <thead>
                      <tr>
                        <th>Resource</th>
                        <th>Time Slot</th>
                        <th>Researcher</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((b) => {
                        const resource = b.time_slots?.resources;
                        const slot = b.time_slots;
                        return (
                          <tr key={b.id}>
                            <td>{resource?.name || "—"}</td>
                            <td>{formatTime(slot?.start_time)} – {formatTime(slot?.end_time)}</td>
                            <td>{b.researcher_name || "—"}</td>
                            <td><span className="badge badge-limited"><Clock size={11} /> Pending</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Access event log */}
            <div className="section-head" style={{ marginTop: "32px" }}>
              <h2>Access Event Log</h2>
              <p>Chronological record of booking events.</p>
            </div>
            <div className="card access-log">
              <table>
                <thead>
                  <tr><th>Event</th><th>Resource</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const resource = b.time_slots?.resources;
                    return (
                      <tr key={b.id}>
                        <td>
                          {b.approval_status === "confirmed" ? "Payment verified & access unlocked" : "Booking request submitted"}
                        </td>
                        <td>{resource?.name || "—"}</td>
                        <td>
                          <span
                            className="dot-status"
                            style={{
                              background: b.approval_status === "confirmed" ? "var(--available)" : "var(--signal)",
                            }}
                          ></span>
                          {b.approval_status === "confirmed" ? "Confirmed" : "Pending"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
