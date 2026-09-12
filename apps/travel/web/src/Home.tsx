import { ChevronRight, Plane } from "lucide-react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <main className="page">
      <h1>Domains</h1>
      <ul className="domains">
        <li>
          <Link to="/travel" className="domain-card">
            <span className="ico">
              <Plane size={16} />
            </span>
            <span>
              <strong>Travel</strong>
              <em>Flights, trips, credits, point valuations</em>
            </span>
            <ChevronRight size={16} className="chev" />
          </Link>
        </li>
      </ul>
    </main>
  );
}
