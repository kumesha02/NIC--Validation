import { Menu, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/upload', label: 'Upload Files' },
  { to: '/records', label: 'View Records' },
  { to: '/reports', label: 'Reports' }
];

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-md border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="text-lg font-semibold text-primary-600">
            NIC Validation System
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-500'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-gray-700">{user?.username}</p>
            <p className="text-xs text-gray-500">Logged in</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 md:hidden">
        <nav className="grid gap-2 px-4 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
