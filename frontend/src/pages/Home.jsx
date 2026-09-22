import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardStats, fetchResourcesFull } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ResourceCard from "../components/ResourceCard.jsx";
import { Activity, Building2, Clock, Zap, ArrowRight } from "lucide-react";

/* ── Animated counter ───────────────────────────────────────── */
function AnimatedValue({ target, suffix = "" }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0) return;
    let frame;
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{value.toLocaleString("en-IN")}{suffix}</>;
}

/* ── Flow pipeline step ─────────────────────────────────────── */
const STEPS = [
  { to: "/discover", num: 1, label: "Discover" },
  { to: "/match", num: 2, label: "AI Match" },
  { to: "/booking/select", num: 3, label: "Reserve" },
  { to: "/payment", num: 4, label: "Pay via x402" },
  { to: "/access", num: 5, label: "Smart Access" },
  { to: "/tracking", num: 6, label: "Track" },
];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsData, resources] = await Promise.all([
          fetchDashboardStats(),
          fetchResourcesFull(),
        ]);
        if (cancelled) return;
        setStats(statsData);
        // Pick resources that have available slots as featured
        const withAvail = resources
          .filter((r) => r.time_slots?.some((s) => s.status === "available"))
          .slice(0, 3);
        setFeatured(withAvail);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-wrap" id="page-home">
      {/* Hero */}
      <div className="hero">
        <div className="wrap hero-inner">
          <h1>Idle capacity, verified and reservable.</h1>
          <p className="lede">
            Hospitals and research labs list unused equipment and facility
            time — then book each other's capacity through a pay-per-use
            protocol settled on-chain via Algorand.
          </p>
          <div className="hero-ctas">
            <Link to="/discover" className="btn btn-primary">
              Reserve capacity <ArrowRight size={16} />
            </Link>
            <Link to="/match" className="btn btn-outline">
              Find a match
            </Link>
          </div>
        </div>

        {/* Flow pipeline */}
        <div className="wrap flow">
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ display: "contents" }}>
              <Link to={step.to} className="flow-node">
                <div className="ring">{step.num}</div>
                <div className="lbl">{step.label}</div>
              </Link>
              {i < STEPS.length - 1 && <div className="flow-connector"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Live network stats */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <h2>The network right now</h2>
            <p>Live counts across every verified institution on ResourceLink.</p>
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching network stats…" />
          ) : stats ? (
            <div className="stat-grid">
              <div className="card stat-card">
                <div className="label"><Activity size={14} /> Active listings</div>
                <div className="value"><AnimatedValue target={stats.resourceCount} /></div>
                <div className="sub">Across {stats.institutionCount} institutions</div>
              </div>
              <div className="card stat-card">
                <div className="label"><Building2 size={14} /> Verified institutions</div>
                <div className="value"><AnimatedValue target={stats.institutionCount} /></div>
                <div className="sub">Hospitals & research labs</div>
              </div>
              <div className="card stat-card">
                <div className="label"><Clock size={14} /> Slots booked</div>
                <div className="value"><AnimatedValue target={stats.bookedSlots} /></div>
                <div className="sub">Out of {stats.totalSlots} total slots</div>
              </div>
              <div className="card stat-card">
                <div className="label"><Zap size={14} /> Available now</div>
                <div className="value"><AnimatedValue target={stats.availableSlots} /></div>
                <div className="sub">Ready to reserve instantly</div>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>Could not load stats.</p>
          )}
        </div>
      </section>

      {/* Featured resources */}
      {featured.length > 0 && (
        <section>
          <div className="wrap">
            <div className="section-head">
              <h2>Featured resources</h2>
              <p>Equipment with open capacity right now.</p>
            </div>
            <div className="listing-grid">
              {featured.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link to="/discover" className="btn btn-outline">
                View all resources <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
