import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useApi } from '../../shared/hooks';
import { DataState, Empty, Pagination, ProductCard } from '../../shared/UI';
import { useCart } from './CartContext';
export default function Catalog() {
  const [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState(false),
    categories = useApi('/categories'),
    { add } = useCart();
  const page = Number(params.get('page') || 0),
    query = useApi('/products', { ...Object.fromEntries(params), page, size: 9 });
  function change(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  const activeCategory = categories.data?.find((c) => String(c.id) === params.get('category'));
  return (
    <div className="store-container catalog-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>{activeCategory?.name || 'All products'}</span>
      </div>
      <div className="page-heading">
        <div>
          <h1>{activeCategory?.name || 'Your next great find.'}</h1>
          <p>Good technology, chosen with everyday life in mind.</p>
        </div>
        <span className="muted">{query.data?.totalElements ?? '…'} products</span>
      </div>
      <div className="catalog-layout">
        <aside className={`catalog-filters ${filters ? 'visible' : ''}`}>
          <div className="filter-heading">
            <h2>Filters</h2>
            <button className="text-button" onClick={() => setParams({})}>
              Reset
            </button>
          </div>
          <h3>Category</h3>
          <label className="check-label">
            <input
              type="radio"
              name="category"
              checked={!params.get('category')}
              onChange={() => change('category', '')}
            />
            All products
          </label>
          {categories.data?.map((c) => (
            <label key={c.id} className="check-label">
              <input
                type="radio"
                name="category"
                checked={params.get('category') === String(c.id)}
                onChange={() => change('category', c.id)}
              />
              {c.name}
            </label>
          ))}
          <h3 className="filter-subheading">Price range</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                next = new URLSearchParams(params);
              for (const key of ['minPrice', 'maxPrice']) {
                const value = f.get(key);
                value ? next.set(key, value) : next.delete(key);
              }
              next.delete('page');
              setParams(next);
            }}
          >
            <div className="price-inputs">
              <input
                aria-label="Minimum price"
                name="minPrice"
                type="number"
                min="0"
                placeholder="Min $"
                defaultValue={params.get('minPrice') || ''}
              />
              <input
                aria-label="Maximum price"
                name="maxPrice"
                type="number"
                min="0"
                placeholder="Max $"
                defaultValue={params.get('maxPrice') || ''}
              />
            </div>
            <button className="full" type="submit">
              Apply price
            </button>
          </form>
          <div className="filter-note">
            <TruckIcon />
            <strong>A little extra, on us.</strong>
            <p>Free shipping on all orders of $100 or more.</p>
            <Link to="/help">Delivery details</Link>
          </div>
        </aside>
        <section>
          <div className="catalog-toolbar">
            <button className="mobile-only" onClick={() => setFilters(!filters)}>
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <form
              className="search-field"
              onSubmit={(e) => {
                e.preventDefault();
                change('q', new FormData(e.currentTarget).get('q'));
              }}
            >
              <Search size={17} />
              <input
                key={params.get('q') || ''}
                name="q"
                aria-label="Search collection"
                placeholder="Search the collection"
                defaultValue={params.get('q') || ''}
              />
            </form>
            <select
              aria-label="Sort products"
              value={params.get('sort') || 'createdAt,desc'}
              onChange={(e) => change('sort', e.target.value)}
            >
              <option value="createdAt,desc">Newest arrivals</option>
              <option value="price,asc">Price: low to high</option>
              <option value="price,desc">Price: high to low</option>
              <option value="name,asc">Name: A to Z</option>
            </select>
          </div>
          {params.get('q') && (
            <p className="search-result">
              Results for “{params.get('q')}”{' '}
              <button className="icon-button" aria-label="Clear search" onClick={() => change('q', '')}>
                <X size={14} />
              </button>
            </p>
          )}
          <DataState query={query}>
            {(data) =>
              data.content.length ? (
                <>
                  <div className="product-grid catalog-grid">
                    {data.content.map((p) => (
                      <ProductCard key={p.id} product={p} onAdd={add} />
                    ))}
                  </div>
                  <Pagination
                    data={data}
                    onPage={(p) => {
                      change('page', p);
                      window.scrollTo(0, 0);
                    }}
                  />
                </>
              ) : (
                <Empty
                  title="No matches this time"
                  text="Try another search or clear your filters."
                  action={<button onClick={() => setParams({})}>Clear filters</button>}
                />
              )
            }
          </DataState>
        </section>
      </div>
    </div>
  );
}
function TruckIcon() {
  return <SlidersHorizontal size={22} />;
}
