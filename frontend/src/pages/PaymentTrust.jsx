import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchBookings } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import {
  Shield, Lock, Sun, ArrowRight, CreditCard,
  CheckCircle, Clock, ExternalLink
} from "lucide-react";

export default function PaymentTrust() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings()
      .then((data) => setBookings(data || []))
      .catch((err) => console.error("Failed to fetch bookings:", err))
      .finally(() => setLoading(false));
  }, []);

  // Separate bookings by status
  const confirmed = bookings.filter((b) => b.approval_status === "confirmed");
  const pending = bookings.filter((b) => b.approval_status === "pending_approval");

  return (
    <div className="page-wrap" id="page-payment">
      <div className="wrap page-head">
        <h1>Payment & Trust</h1>
        <p>
          Every reservation settles on Algorand through the x402 pay-per-use
          protocol, with institutional verification checked before funds move.
        </p>
      </div>

      {/* x402 Protocol Flow Visualization */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="card" style={{ padding: "24px 28px" }}>
            <div className="section-head" style={{ marginBottom: "16px" }}>
              <h2>x402 Payment Protocol</h2>
              <p>How a resource booking is settled on the Algorand blockchain.</p>
            </div>
            <div className="stepper">
              <div className="st done">
                <div className="num">1</div>
                <div className="lbl">Request sent</div>
                <div className="sub">Booking intent submitted</div>
              </div>
              <div className="st done">
                <div className="num">2</div>
                <div className="lbl">402 required</div>
                <div className="sub">Server returns payment demand</div>
              </div>
              <div className="st current">
                <div className="num">3</div>
                <div className="lbl">On-chain payment</div>
                <div className="sub">Algorand Testnet settlement</div>
              </div>
              <div className="st">
                <div className="num">4</div>
                <div className="lbl">Access unlocked</div>
                <div className="sub">Credentials issued</div>
              </div>
            </div>
            <div className="flowlog">
              <div><span className="tag2">→</span> Institution submits booking intent via <code>/api/bookings/request</code></div>
              <div><span className="tag2">→</span> Server returns HTTP 402 — payment required for the resource slot</div>
              <div><span className="tag2">→</span> Client sends ALGO micropayment on Algorand Testnet</div>
              <div><span className="tag2">→</span> GoPlausible facilitator verifies the transaction</div>
              <div><span className="tag2">→</span> Settlement confirmed via <code>/api/bookings/settle</code> <span className="ok">✓</span></div>
              <div><span className="tag2">→</span> Proof-of-Usage logged with Algorand Transaction ID</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <h2>Network Transactions</h2>
            <p>Recent booking activity across the ResourceLink network.</p>
          </div>
          {loading ? (
            <LoadingSpinner message="Loading transactions…" />
          ) : bookings.length === 0 ? (
            <div className="card" style={{ padding: "32px", textAlign: "center" }}>
              <CreditCard size={32} style={{ color: "var(--muted)", marginBottom: "12px" }} />
              <p style={{ color: "var(--muted)" }}>No bookings yet. Be the first to reserve!</p>
              <Link to="/discover" className="btn btn-primary btn-sm" style={{ marginTop: "12px" }}>
                Browse Resources <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="card">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Resource</th>
                    <th>Researcher</th>
                    <th>Status</th>
                    <th>Algorand Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const resource = b.time_slots?.resources;
                    return (
                      <tr key={b.id}>
                        <td className="mono" style={{ fontSize: "12px" }}>{b.id.slice(0, 8)}…</td>
                        <td>{resource?.name || "—"}</td>
                        <td>{b.researcher_name || "—"}</td>
                        <td>
                          <span className={`badge badge-${b.approval_status === "confirmed" ? "available" : "limited"}`}>
                            {b.approval_status === "confirmed" ? "Confirmed" : "Pending"}
                          </span>
                        </td>
                        <td>
                          {b.algorand_tx_id ? (
                            <a
                              href={`https://testnet.explorer.perawallet.app/tx/${b.algorand_tx_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tx-link"
                            >
                              {b.algorand_tx_id.slice(0, 12)}… <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Trust features */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <h2>Why institutions trust the network</h2>
            <p>Every listing and requester is checked before capacity is exposed.</p>
          </div>
          <div className="trust-grid">
            <div className="card trust-card">
              <div className="ic">
                <Shield size={20} />
              </div>
              <div>
                <h3>Institutional verification</h3>
                <p>Every account is tied to a registered hospital or research institution, checked before listing access.</p>
              </div>
            </div>
            <div className="card trust-card">
              <div className="ic">
                <Lock size={20} />
              </div>
              <div>
                <h3>Escrowed settlement</h3>
                <p>x402 holds payment until access is confirmed unlocked on the requester's side.</p>
              </div>
            </div>
            <div className="card trust-card">
              <div className="ic">
                <Sun size={20} />
              </div>
              <div>
                <h3>Full audit trail</h3>
                <p>Every request, payment, and access event is logged on Algorand and visible to both institutions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
