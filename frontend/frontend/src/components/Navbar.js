import { FaSearch, FaUserCircle } from "react-icons/fa";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">SceneIQ AI</div>

      <div className="nav-links">
        <a href="/">Home</a>
        <a href="/watch">Watch</a>
        <a href="/upload">Upload</a>
        <a href="/dashboard">Dashboard</a>
      </div>

      <div className="nav-icons">
        <FaSearch />
        <FaUserCircle />
      </div>
    </nav>
  );
}


