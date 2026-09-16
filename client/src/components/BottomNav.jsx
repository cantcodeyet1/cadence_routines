import { NavLink } from "react-router-dom";
import { IconHome, IconLayers, IconGrid, IconPerson } from "./Icons.jsx";

const items = [
  { to: "/", label: "Home", Icon: IconHome, end: true },
  { to: "/routines", label: "Routines", Icon: IconLayers },
  { to: "/habits", label: "Habits", Icon: IconGrid },
  { to: "/profile", label: "Profile", Icon: IconPerson },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="icon-slot">
            <Icon />
          </span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
