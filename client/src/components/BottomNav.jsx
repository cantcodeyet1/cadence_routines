import { NavLink } from "react-router-dom";
import { IconHome, IconGrid, IconBars, IconPerson } from "./Icons.jsx";

const items = [
  { to: "/", label: "Home", Icon: IconHome, end: true },
  { to: "/habits", label: "Habits", Icon: IconGrid },
  { to: "/progress", label: "Progress", Icon: IconBars },
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
