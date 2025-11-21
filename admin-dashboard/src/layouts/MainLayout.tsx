import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, Users, Car } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/runs', label: 'Delivery Runs', icon: Truck },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/drivers', label: 'Drivers', icon: Users },
  { path: '/vehicles', label: 'Vehicles', icon: Car },
];

export function MainLayout() {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex min-h-screen bg-dark-bg">
      {/* Sidebar */}
      <nav className="w-64 bg-dark-card border-r border-dark-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-dark-border">
          <h1 className="text-xl font-bold text-white">
            <span className="bg-gradient-to-r from-gradient-pink-start to-gradient-pink-end bg-clip-text text-transparent">
              Ordak
            </span>{' '}
            Delivery
          </h1>
          <p className="text-xs text-ordak-gray-400 mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <ul className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-gradient-pink-start to-gradient-pink-end text-white shadow-lg shadow-gradient-pink-start/20'
                      : 'text-ordak-gray-400 hover:bg-dark-card-hover hover:text-white'
                  )}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border">
          <div className="text-xs text-ordak-gray-600">
            v0.1.0
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
