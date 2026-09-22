import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { runAIMatch, fetchResourcesFull } from "../lib/api.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { Search, MapPin, Cpu, ArrowRight, CheckCircle, AlertCircle, Star } from "lucide-react";

export default function AIMatch() {
  const navigate = useNavigate();

  // Form state
  const [category, setCategory] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:30");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:30");
  const [latitude, setLatitude] = useState("13.0827");
  const [longitude, setLongitude] = useState("80.2707");
  const [operatorRequired, setOperatorRequired] = useState(false);

  // Results state
  const [matches, setMatches] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // Categories from real data
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchResourcesFull()
      .then((res) => {
        const cats = [...new Set(res.map((r) => r.category).filter(Boolean))].sort();
        setCategories(cats);
      })
      .catch(() => {});

    // Set default dates to today
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    setStartDate(dateStr);
    setEndDate(dateStr);
  }, []);

  async function handleMatch(e) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    setMatches(null);

    try {
      const capArray = capabilities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        category: category || undefined,
        required_capability: capArray.length > 0 ? capArray : undefined,
        start_time: `${startDate}T${startTime}:00+05:30`,
        end_time: `${endDate}T${endTime}:00+05:30`,
        latitude: parseFloat(latitude) || undefined,
        longitude: parseFloat(longitude) || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        operator_required: operatorRequired,
      };

      const result = await runAIMatch(payload);
      setMatches(result.matches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  function scoreColor(score) {
    if (score >= 80) return "var(--available)";
    if (score >= 50) return "var(--signal)";
    return "var(--booked)";
  }

  return (
    <div className="page-wrap" id="page-match">
      <div className="wrap page-head">
        <h1><Cpu size={28} style={{ verticalAlign: "middle", marginRight: "8px" }} />AI Match</h1>
        <p>
          Describe what you need — the AI engine scores available resources across
          capability, location, cost, and scheduling fit, then ranks the closest matches.
        </p>
      </div>

      {/* Match form */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <form className="card match-form-grid" onSubmit={handleMatch}>
            <div className="field-block">
              <label>Category</label>
              <div className="field">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Any category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-block">
              <label>Required capabilities</label>
              <div className="field">
                <input
                  placeholder="e.g. TEM, cryo, structural biology"
                  value={capabilities}
                  onChange={(e) => setCapabilities(e.target.value)}
                />
              </div>
            </div>

            <div className="field-block">
              <label>Start date & time</label>
              <div className="field-row">
                <div className="field">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="field">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="field-block">
              <label>End date & time</label>
              <div className="field-row">
                <div className="field">
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="field">
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="field-block">
              <label>Your location (lat, lng)</label>
              <div className="field-row">
                <div className="field">
                  <input type="number" step="any" placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                </div>
                <div className="field">
                  <input type="number" step="any" placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="field-block">
              <label>Budget (ALGO)</label>
              <div className="field">
                <input type="number" step="0.01" placeholder="Max budget in ALGO" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>

            <div className="field-block check-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={operatorRequired} onChange={(e) => setOperatorRequired(e.target.checked)} />
                Operator required
              </label>
            </div>

            <div className="field-block">
              <button type="submit" className="btn btn-primary" disabled={running}>
                {running ? "Matching…" : "Run AI Match"} <Search size={14} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          {running && <LoadingSpinner message="Running AI match algorithm…" />}
          {error && <ErrorMessage message={error} onRetry={() => {}} />}

          {matches && !running && (
            <>
              <div className="section-head">
                <h2>
                  {matches.length > 0
                    ? `${matches.length} match${matches.length !== 1 ? "es" : ""} found`
                    : "No matches found"}
                </h2>
                <p>Ranked by overall fit score from the AI engine.</p>
              </div>

              {matches.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle size={32} />
                  <p>No resources matched your criteria. Try broadening your filters or adjusting the time window.</p>
                </div>
              ) : (
                <div className="match-list">
                  {matches.map((m, i) => (
                    <div className="card match-card" key={m.resource_id || i}>
                      <div className="match-rank">#{i + 1}</div>
                      <div className="match-info">
                        <h3>{m.resource_name}</h3>
                        <div className="inst">
                          {m.institution_name}
                          {m.facility_name && ` — ${m.facility_name}`}
                          {m.distance_km != null && (
                            <span className="distance">
                              <MapPin size={12} /> {m.distance_km} km away
                            </span>
                          )}
                        </div>
                        <div className="reason-tags">
                          {(m.reasons || []).map((tag, j) => (
                            <span className="tag" key={j}>{tag}</span>
                          ))}
                          {m.category && <span className="tag">{m.category}</span>}
                        </div>
                        <div className="match-meta">
                          <span>{m.hourly_rate_algo} ALGO/hr</span>
                          <span>Est. total: {m.estimated_cost_algo} ALGO</span>
                          {m.operator_required && <span>Operator included</span>}
                        </div>
                      </div>
                      <div className="score-block">
                        <div className="score-row">
                          <span>Overall fit</span>
                          <span style={{ color: scoreColor(m.match_score), fontWeight: 600 }}>
                            {m.match_score}%
                          </span>
                        </div>
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{
                              width: `${m.match_score}%`,
                              background: scoreColor(m.match_score),
                            }}
                          ></div>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/booking/${m.resource_id}`)}
                      >
                        Reserve <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
