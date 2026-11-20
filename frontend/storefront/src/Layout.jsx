import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, UserRound, Truck, ArrowRight, Menu, X } from 'lucide-react';
import { Brand, useToast } from '../../shared/UI';
import { useAuth } from '../../shared/Auth';
import { useApi } from '../../shared/hooks';
import { api, errorMessage } from '../../shared/api';
import { useCart } from './CartContext';
export default function Layout() {
  const { user } = useAuth(),
    { count } = useCart(),
    navigate = useNavigate(),
    toast = useToast();
  const categories = useApi('/categories'),
    [open, setOpen] = useState(false),
    [submitting, setSubmitting] = useState(false);
  const search = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    navigate(`/products?q=${encodeURIComponent(q)}`);
  };
  async function subscribe(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    try {
      await api.post('/newsletter', { email: new FormData(form).get('email') });
      toast('You’re on the list. Thanks for subscribing.');
      form.reset();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="announcement">
        <span>Good tech. Better everyday.</span>
        <span>
          <Truck size={13} />
          Free shipping on orders $100+
        </span>
        <Link to="/help">
          Shipping & returns
          <ArrowRight size={12} />
        </Link>
      </div>
      <header className="store-header">
        <div className="store-header-inner">
          <Brand />
          <form className="store-search" onSubmit={search}>
            <Search size={18} />
            <input name="q" aria-label="Search products" placeholder="Search for your next upgrade…" />
            <button aria-label="Submit search">
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="header-actions">
            <Link to={user ? '/account' : '/login'}>
              <UserRound size={20} />
              <span>{user ? user.name.split(' ')[0] : 'Account'}</span>
            </Link>
            <Link to="/cart" className="bag-link">
              <ShoppingBag size={20} />
              <span>Bag</span>
              <b>{count}</b>
            </Link>
            <button
              className="icon-button mobile-only"
              aria-label="Toggle categories"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav className={`store-nav ${open ? 'open' : ''}`} aria-label="Shop categories">
          <div>
            <NavLink to="/products" end onClick={() => setOpen(false)}>
              Shop all
            </NavLink>
            {categories.data?.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`} onClick={() => setOpen(false)}>
                {c.name}
              </Link>
            ))}
            <Link to="/products?sort=createdAt,desc" className="nav-last" onClick={() => setOpen(false)}>
              New arrivals
              <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <section className="newsletter">
        <div>
          <h2>A little ahead of the curve.</h2>
          <p>New arrivals, considered picks, and a good deal now and then.</p>
        </div>
        <form onSubmit={subscribe}>
          <input
            aria-label="Newsletter email"
            name="email"
            type="email"
            placeholder="Your email address"
            required
          />
          <button className="primary" disabled={submitting}>
            {submitting ? 'Joining…' : 'Keep me posted'}
            <ArrowRight size={15} />
          </button>
        </form>
      </section>
      <footer className="store-footer">
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              Thoughtfully chosen tech.
              <br />
              For the way you work, play, and live.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <Link to="/products">All products</Link>
            <Link to="/products?sort=createdAt,desc">New arrivals</Link>
            <Link to="/products?maxPrice=100">Under $100</Link>
          </div>
          <div>
            <h3>Your NOVARA</h3>
            <Link to="/account">My account</Link>
            <Link to="/account/orders">Track an order</Link>
            <Link to="/cart">Shopping bag</Link>
          </div>
          <div>
            <h3>Good to know</h3>
            <Link to="/help">Shipping & returns</Link>
            <Link to="/help#payments">Payment information</Link>
            <Link to="/help#about">About NOVARA</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} NOVARA. A demonstration store.</span>
          <span>USD · Simulated payments only</span>
        </div>
      </footer>
    </>
  );
}
