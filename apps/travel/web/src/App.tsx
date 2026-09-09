import { Hexagon } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./Home";
import { IataHover } from "./AirportCode";
import { Travel } from "./Travel";
import { Toasts } from "./toasts";

export default function App() {
  return (
    <>
      <header className="top">
        <Link to="/" className="brand">
          <Hexagon size={16} />
          Life OS
        </Link>
      </header>
      <Toasts />
      <IataHover />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/travel" element={<Travel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
