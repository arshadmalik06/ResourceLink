import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/match", label: "AI Match" },
  { to: "/payment", label: "Payment & Trust" },
  { to: "/access", label: "Smart Access" },
  { to: "/tracking", label: "Tracking" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="rl-nav">
      <div className="tick-rule"></div>
      <div className="wrap nav-inner">
        <NavLink to="/" className="wordmark" onClick={() => setMobileOpen(false)}>
          <span className="dot"></span>
          <span className="font-heading">ResourceLink</span>
        </NavLink>

        <button
          className="mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-links ${mobileOpen ? "open" : ""}`} id="navLinks">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <NavLink to="/discover" className="btn btn-primary btn-sm nav-cta">
          Reserve Capacity
        </NavLink>
      </div>
    </nav>
  );
}
