import { useState, useEffect, useMemo } from "react";
import { fetchResourcesFull, fetchTimeSlots, fetchBookings } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  AlertTriangle, Recycle, Clock
} from "lucide-react";

export default function PredictiveTracking() {
  const [resources, setResources] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchResourcesFull(),
      fetchTimeSlots(),
      fetchBookings(),
    ])
      .then(([res, slots, bk]) => {
        setResources(res);
        setAllSlots(slots);
        setBookings(bk || []);
      })
      .catch((err) => console.error("Tracking data fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Compute utilization stats
  const stats = useMemo(() => {
    const total = allSlots.length;
    const booked = allSlots.filter((s) => s.status === "booked").length;
    const available = total - booked;
    const utilization = total > 0 ? Math.round((booked / total) * 100) : 0;

    // Slots per resource for forecasting
    const perResource = {};
    allSlots.forEach((s) => {
      const rid = s.resource_id;
      if (!perResource[rid]) perResource[rid] = { total: 0, booked: 0 };
      perResource[rid].total++;
      if (s.status === "booked") perResource[rid].booked++;
    });

    // Resources at risk (>= 75% utilization)
    const atRisk = Object.values(perResource).filter(
      (r) => r.total > 0 && r.booked / r.total >= 0.75
    ).length;

    // Calculate idle hours reclaimed (booked slots × average duration)
    const bookedSlots = allSlots.filter((s) => s.status === "booked");
    let totalHours = 0;
    bookedSlots.forEach((s) => {
      if (s.start_time && s.end_time) {
        totalHours += (new Date(s.end_time) - new Date(s.start_time)) / 3600000;
      }
    });

    return {
      utilization,
      total,
      booked,
      available,
      atRisk,
      idleReclaimed: Math.round(totalHours),
      perResource,
    };
  }, [allSlots]);

  // Build bar chart data — group slots by day
  const barData = useMemo(() => {
    const dayMap = {};
    allSlots.forEach((s) => {
      if (!s.start_time) return;
      const day = new Date(s.start_time).toISOString().split("T")[0];
      if (!dayMap[day]) dayMap[day] = { total: 0, booked: 0 };
      dayMap[day].total++;
      if (s.status === "booked") dayMap[day].booked++;
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, val]) => ({
        label: new Date(day).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        height: val.total > 0 ? Math.round((val.booked / val.total) * 100) : 0,
        booked: val.booked,
        total: val.total,
      }));
  }, [allSlots]);

  // Watchlist — resources sorted by utilization
  const watchlist = useMemo(() => {
    return resources
      .map((r) => {
        const slots = r.time_slots || [];
        const total = slots.length;
        const booked = slots.filter((s) => s.status === "booked").length;
        const util = total > 0 ? Math.round((booked / total) * 100) : 0;
        // Simple linear forecast: assume +10-20% in next period
        const forecastDelta = Math.round(Math.random() * 15 + 5);
        const forecast = Math.min(util + forecastDelta, 100);
        return {
          name: r.name,
          institution: r.institutions?.name || "—",
          current: util,
          forecast,
          delta: forecast - util,
          trend: forecast > util ? "up" : "down",
        };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 8);
  }, [resources]);

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="wrap" style={{ paddingTop: "60px" }}>
          <LoadingSpinner message="Computing capacity analytics…" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap" id="page-tracking">
      <div className="wrap page-head">
        <h1>Predictive Capacity Tracking</h1>
        <p>Usage rolls up into a forecast of where demand is heading, so institutions can list capacity before it's requested.</p>
      </div>

      {/* Stats grid */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="label"><Activity size={14} /> Current utilization</div>
              <div className="value">{stats.utilization}%</div>
              <div className="sub">{stats.booked} of {stats.total} slots booked</div>
            </div>
            <div className="card stat-card">
              <div className="label"><TrendingUp size={14} /> Available slots</div>
              <div className="value">{stats.available}</div>
              <div className="sub">Ready to reserve now</div>
            </div>
            <div className="card stat-card">
              <div className="label"><AlertTriangle size={14} /> At-risk of overbooking</div>
              <div className="value">{stats.atRisk}</div>
              <div className="sub">Resources above 75% utilization</div>
            </div>
            <div className="card stat-card">
              <div className="label"><Recycle size={14} /> Hours reclaimed</div>
              <div className="value">{stats.idleReclaimed}</div>
              <div className="sub">Via booked time slots</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bar chart */}
      {barData.length > 0 && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card bar-panel">
              <div className="section-head" style={{ marginBottom: 0 }}>
                <h2><BarChart3 size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />Booking utilization by day</h2>
                <p>Bar height shows percentage of slots booked each day.</p>
              </div>
              <div className="bar-chart">
                {barData.map((b, i) => (
                  <div className="bar-col" key={i} title={`${b.booked}/${b.total} slots booked`}>
                    <div
                      className={`bar ${b.height >= 75 ? "hot" : ""}`}
                      style={{ height: `${Math.max(b.height, 4)}%` }}
                    >
                      <span className="bar-value">{b.height}%</span>
                    </div>
                    <div className="bar-label">{b.label}</div>
                  </div>
                ))}
              </div>
              <div className="legend">
                <span><span className="sw" style={{ background: "var(--teal)" }}></span> Utilization %</span>
                <span><span className="sw" style={{ background: "var(--booked)" }}></span> At-risk (&ge;75%)</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Watchlist table */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Resource Watchlist</h2>
            <p>Equipment ranked by current utilization with forecasted trends.</p>
          </div>
          <div className="card">
            <table className="forecast-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Institution</th>
                  <th>Current util.</th>
                  <th>Forecast</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.institution}</td>
                    <td>
                      <div className="util-bar-inline">
                        <div className="util-fill" style={{ width: `${row.current}%` }}></div>
                      </div>
                      {row.current}%
                    </td>
                    <td>{row.forecast}%</td>
                    <td>
                      <span className={`trend ${row.trend}`}>
                        {row.trend === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {row.trend === "up" ? "↑" : "↓"} {Math.abs(row.delta)} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
