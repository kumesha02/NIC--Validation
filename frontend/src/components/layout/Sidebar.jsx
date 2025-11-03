import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Table, FileText } from 'lucide-react';

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Files', icon: UploadCloud },
  { to: '/records', label: 'View Records', icon: Table },
  { to: '/reports', label: 'Reports', icon: FileText }
];

const Sidebar = ({ isOpen }) => (
  <aside
    className={`fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-gray-200 bg-white pt-24 transition-transform md:block ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
  >
    <nav className="flex flex-col gap-1 px-4">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-primary-600'
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;
