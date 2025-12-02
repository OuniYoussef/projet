import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© {new Date().getFullYear()} HubShop. Tous droits réservés.</p>
        <div className="footer-links">
          <Link to="/about">À propos</Link>
          <a href="/contact">Contact</a>
          <a href="/conditions">Conditions</a>
        </div>
      </div>
    </footer>
  );
}
