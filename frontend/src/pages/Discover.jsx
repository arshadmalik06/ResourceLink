import { useState, useEffect, useMemo } from "react";
import { fetchResourcesFull } from "../lib/api.js";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import ResourceCard from "../components/ResourceCard.jsx";
import { Search, Filter, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in bundled builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function Discover() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResourcesFull();
      setResources(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Derive filter options from real data
  const categories = useMemo(
    () => [...new Set(resources.map((r) => r.category).filter(Boolean))].sort(),
    [resources]
  );
  const institutions = useMemo(
    () => [...new Set(resources.map((r) => r.institutions?.name).filter(Boolean))].sort(),
    [resources]
  );

  // Apply filters
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          r.name,
          r.facility_name,
          r.category,
          r.institutions?.name,
          ...(r.capability_tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Category
      if (categoryFilter && r.category !== categoryFilter) return false;
      // Institution
      if (institutionFilter && r.institutions?.name !== institutionFilter) return false;
      // Status
      if (statusFilter) {
        const slots = r.time_slots || [];
        const avail = slots.filter((s) => s.status === "available").length;
        if (statusFilter === "available" && avail === 0) return false;
        if (statusFilter === "limited" && (avail === 0 || avail > 2)) return false;
        if (statusFilter === "booked" && avail > 0) return false;
      }
      return true;
    });
  }, [resources, search, categoryFilter, institutionFilter, statusFilter]);

  // Map markers — group by institution lat/lng
  const markers = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const inst = r.institutions;
      if (!inst || inst.latitude == null || inst.longitude == null) return;
      const key = `${inst.latitude},${inst.longitude}`;
      if (!map.has(key)) {
        map.set(key, {
          lat: inst.latitude,
          lng: inst.longitude,
          name: inst.name,
          resources: [],
        });
      }
      map.get(key).resources.push(r);
    });
    return [...map.values()];
  }, [filtered]);

  // Center map on India
  const center = [13.5, 79.0];

  return (
    <div className="page-wrap" id="page-discover">
      <div className="wrap page-head">
        <h1>Discover</h1>
        <p>Search verified institutional capacity by equipment type, location, and availability window.</p>
      </div>

      {/* Filters */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="card filter-bar">
            <div className="field grow">
              <Search size={16} />
              <input
                placeholder="Search equipment, e.g. MRI, spectrometer, cleanroom…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="field">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <select value={institutionFilter} onChange={(e) => setInstitutionFilter(e.target.value)}>
                <option value="">All institutions</option>
                {institutions.map((inst) => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Any status</option>
                <option value="available">Available</option>
                <option value="limited">Limited slots</option>
                <option value="booked">Fully booked</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      {!loading && markers.length > 0 && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card map-container">
              <MapContainer center={center} zoom={6} style={{ height: "360px", borderRadius: "6px" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {markers.map((m, i) => (
                  <Marker key={i} position={[m.lat, m.lng]}>
                    <Popup>
                      <strong>{m.name}</strong>
                      <br />
                      {m.resources.length} resource{m.resources.length !== 1 ? "s" : ""}
                      <ul style={{ margin: "6px 0 0", padding: "0 0 0 16px", fontSize: "12px" }}>
                        {m.resources.map((r) => (
                          <li key={r.id}>{r.name}</li>
                        ))}
                      </ul>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          {loading ? (
            <LoadingSpinner message="Loading resources…" />
          ) : error ? (
            <ErrorMessage message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Filter size={32} />
              <p>No resources match your filters. Try broadening your search.</p>
            </div>
          ) : (
            <>
              <div className="result-count">
                {filtered.length} resource{filtered.length !== 1 ? "s" : ""} found
              </div>
              <div className="listing-grid">
                {filtered.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
