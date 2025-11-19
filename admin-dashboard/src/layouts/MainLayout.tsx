import { Link, Outlet, useLocation } from 'react-router-dom';
import './MainLayout.css';

export function MainLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="main-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Ordak Delivery</h1>
          <p className="subtitle">Admin Dashboard</p>
        </div>
        <ul className="nav-menu">
          <li>
            <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/runs" className={isActive('/runs') ? 'active' : ''}>
              Delivery Runs
            </Link>
          </li>
          <li>
            <Link to="/orders" className={isActive('/orders') ? 'active' : ''}>
              Orders
            </Link>
          </li>
          <li>
            <Link to="/drivers" className={isActive('/drivers') ? 'active' : ''}>
              Drivers
            </Link>
          </li>
          <li>
            <Link to="/vehicles" className={isActive('/vehicles') ? 'active' : ''}>
              Vehicles
            </Link>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
