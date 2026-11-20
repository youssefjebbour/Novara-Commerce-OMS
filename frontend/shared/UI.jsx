import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from 'lucide-react';
import { label, money, media } from './api';
const ToastContext = createContext();
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  return (
    <ToastContext.Provider value={(text) => setToast(text)}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Brand({ small = false }) {
  return (
    <Link className={`brand ${small ? 'brand-small' : ''}`} to="/" aria-label="NOVARA home">
      <svg width="27" height="30" viewBox="0 0 27 30" fill="none" aria-hidden="true">
        <path d="M2 26V4h5l13 17V4h5v22h-5L7 9v17z" fill="currentColor" />
        <path d="M2 26 7 19v7zM20 4h5l-5 7z" fill="#5ad1bf" />
      </svg>
      <span>
        NOVARA<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Status({ value }) {
  return (
    <span className={`status status-${value?.toLowerCase()}`}>
      <span />
      {label(value)}
    </span>
  );
}
export function ErrorMessage({ message, retry }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      {message}
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={20} className="spin" />
      {text}
    </div>
  );
}
export function DataState({ query, children }) {
  if (query.loading && !query.data) return <Loading />;
  if (query.error) return <ErrorMessage message={query.error} retry={query.reload} />;
  if (!query.data) return null;
  return children(query.data);
}
export function Empty({ title = 'Nothing here yet', text, action }) {
  return (
    <div className="empty">
      <ShoppingBag size={28} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHeader({ title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Pagination({ data, onPage }) {
  if (!data || data.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span>
        {data.page * data.size + 1}–{Math.min((data.page + 1) * data.size, data.totalElements)} of{' '}
        {data.totalElements}
      </span>
      <div>
        <button aria-label="Previous page" disabled={data.page === 0} onClick={() => onPage(data.page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {data.page + 1} of {data.totalPages}
        </span>
        <button
          aria-label="Next page"
          disabled={data.page + 1 >= data.totalPages}
          onClick={() => onPage(data.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Field({ label: caption, children, className = '', ...props }) {
  const id = React.useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{caption}</label>
      {children ? React.cloneElement(children, { id }) : <input id={id} {...props} />}
    </div>
  );
}
export function Quantity({ value, onChange, max = 99 }) {
  return (
    <div className="quantity">
      <button aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus size={14} />
      </button>
      <span aria-live="polite">{value}</span>
      <button aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ProductCard({ product: p, onAdd }) {
  return (
    <article className="product-card">
      <Link to={`/products/${p.id}`} className="product-image">
        {p.compareAtPrice > p.price && (
          <span className="sale-tag">Save {money(p.compareAtPrice - p.price)}</span>
        )}
        <img src={media(p.images[0])} alt={p.name} loading="lazy" />
      </Link>
      <div className="product-info">
        <p className="product-category">{p.category.name}</p>
        <Link to={`/products/${p.id}`}>
          <h3>{p.name}</h3>
        </Link>
        <p className="product-price">
          {money(p.price)} {p.compareAtPrice > p.price && <del>{money(p.compareAtPrice)}</del>}
        </p>
        <div className="product-bottom">
          <span className={`stock ${p.stock ? '' : 'out'}`}>
            <i />
            {p.stock ? (p.stock <= 10 ? `Only ${p.stock} left` : 'In stock') : 'Out of stock'}
          </span>
          <button
            className="add-button"
            aria-label={`Add ${p.name} to cart`}
            disabled={!p.stock}
            onClick={() => onAdd(p)}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function SectionTitle({ title, to, link = 'View all' }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {link}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
