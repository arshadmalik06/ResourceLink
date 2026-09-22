import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Discover from "./pages/Discover.jsx";
import AIMatch from "./pages/AIMatch.jsx";
import PaymentTrust from "./pages/PaymentTrust.jsx";
import SmartAccess from "./pages/SmartAccess.jsx";
import PredictiveTracking from "./pages/PredictiveTracking.jsx";
import BookingFlow from "./pages/BookingFlow.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/match" element={<AIMatch />} />
        <Route path="/booking/:resourceId" element={<BookingFlow />} />
        <Route path="/payment" element={<PaymentTrust />} />
        <Route path="/access" element={<SmartAccess />} />
        <Route path="/tracking" element={<PredictiveTracking />} />
      </Routes>
      <footer>
        <div className="wrap">
          <p>ResourceLink — verified institutional exchange. Built on Algorand, settled via x402.</p>
        </div>
      </footer>
    </>
  );
}
