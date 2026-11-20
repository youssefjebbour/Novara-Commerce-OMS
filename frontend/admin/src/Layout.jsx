import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Users,
  CreditCard,
  Truck,
  ChartNoAxesCombined,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Brand } from '../../shared/UI';
import { useAuth } from '../../shared/Auth';
const navigation = [
  ['Overview', '/', LayoutDashboard, ['ADMIN', 'MANAGER']],
  ['Orders', '/orders', ShoppingBag],
  ['Products', '/products', Package, ['ADMIN', 'MANAGER']],
  ['Inventory', '/inventory', Layers, ['ADMIN', 'MANAGER']],
  ['Customers', '/customers', Users, ['ADMIN', 'MANAGER']],
  ['Payments', '/payments', CreditCard, ['ADMIN', 'MANAGER']],
  ['Shipments', '/shipments', Truck],
  ['Analytics', '/analytics', ChartNoAxesCombined, ['ADMIN', 'MANAGER']],
];
export default function Layout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    [menu, setMenu] = useState(false),
    [profile, setProfile] = useState(false);
  const search = (e) => {
    e.preventDefault();
    navigate(`/orders?q=${encodeURIComponent(new FormData(e.currentTarget).get('q'))}`);
  };
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="admin-header">
        <div className="admin-brand">
          <button
            className="icon-button mobile-only"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Brand small />
        </div>
        <form className="admin-search" onSubmit={search}>
          <Search size={16} />
          <input
            aria-label="Search orders"
            name="q"
            placeholder="Search orders, customers, or order numbers"
          />
          <button aria-label="Search">
            <ArrowSearch />
          </button>
        </form>
        <div className="admin-account">
          <button onClick={() => setProfile(!profile)} aria-expanded={profile}>
            <span className="avatar">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              {user.name}
              <small>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {profile && (
            <div className="account-dropdown">
              <span>{user.email}</span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
        <div className="workspace-name">
          <span className="store-symbol">
            <ShoppingBag size={17} />
          </span>
          <div>
            <strong>NOVARA Store</strong>
            <span>Commerce workspace</span>
          </div>
        </div>
        <nav aria-label="OMS navigation">
          {navigation
            .filter((n) => !n[3] || n[3].includes(user.role))
            .map(([name, path, Icon]) => (
              <NavLink key={path} to={path} end={path === '/'} onClick={() => setMenu(false)}>
                <Icon size={18} strokeWidth={1.6} />
                {name}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-section">
          <span>Sales channel</span>
          <a href="http://localhost:5174" target="_blank" rel="noreferrer">
            <ShoppingBag size={17} />
            Online store
            <ExternalLink size={13} />
          </a>
        </div>
        <div className="sidebar-bottom">
          {user.role === 'ADMIN' && (
            <NavLink to="/users" onClick={() => setMenu(false)}>
              <Settings size={18} />
              Team & access
            </NavLink>
          )}
          <div className="workspace-note">
            <span className="online-dot" />
            <div>
              <strong>Demo workspace</strong>
              <p>All payments are simulated</p>
            </div>
          </div>
        </div>
      </aside>
      {menu && (
        <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />
      )}
      <main className="admin-main" id="workspace">
        <Outlet />
      </main>
    </div>
  );
}
function ArrowSearch() {
  return <Search size={14} />;
}
