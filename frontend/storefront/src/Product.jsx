import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Truck, ShieldCheck } from 'lucide-react';
import { useApi } from '../../shared/hooks';
import { DataState, ProductCard, Quantity, SectionTitle } from '../../shared/UI';
import { money, media } from '../../shared/api';
import { useCart } from './CartContext';
export default function Product() {
  const { id } = useParams(),
    query = useApi(`/products/${id}`),
    related = useApi(query.data ? '/products' : null, { category: query.data?.category.id, size: 5 }),
    fallback = useApi(related.data?.content.length === 1 ? '/products' : null, { featured: true, size: 5 }),
    { add } = useCart();
  const recommendations =
    (related.data?.content.length === 1 ? fallback.data?.content : related.data?.content)
      ?.filter((product) => product.id !== Number(id))
      .slice(0, 4) || [];
  const [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(0);
  useEffect(() => {
    setQuantity(1);
    setImage(0);
  }, [id]);
  return (
    <div className="store-container product-page">
      <DataState query={query}>
        {(p) => (
          <>
            <div className="breadcrumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to={`/products?category=${p.category.id}`}>{p.category.name}</Link>
              <span>/</span>
              <span>{p.name}</span>
            </div>
            <div className="product-detail">
              <div>
                <div className="product-gallery">
                  <img src={media(p.images[image] || p.images[0])} alt={p.name} />
                </div>
                {p.images.length > 1 && (
                  <div className="gallery-thumbs">
                    {p.images.map((src, i) => (
                      <button
                        key={src}
                        className={image === i ? 'selected' : ''}
                        aria-label={`View product image ${i + 1}`}
                        onClick={() => setImage(i)}
                      >
                        <img src={media(src)} alt={`${p.name}, view ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="product-description">
                <Link className="muted" to={`/products?category=${p.category.id}`}>
                  {p.category.name}
                </Link>
                <h1>{p.name}</h1>
                <div className="detail-price">
                  {money(p.price)}
                  {p.compareAtPrice > p.price && (
                    <>
                      <del>{money(p.compareAtPrice)}</del>
                      <span>Save {money(p.compareAtPrice - p.price)}</span>
                    </>
                  )}
                </div>
                <p>{p.description}</p>
                <span className={`stock ${p.stock ? '' : 'out'}`}>
                  <i />
                  {p.stock ? `${p.stock} available · Ready for your next setup` : 'Currently out of stock'}
                </span>
                <div className="purchase-row">
                  <Quantity value={quantity} onChange={setQuantity} max={Math.min(p.stock, 99)} />
                  <button className="primary" disabled={!p.stock} onClick={() => add(p, quantity)}>
                    <ShoppingBag size={17} />
                    Add to bag
                  </button>
                </div>
                <div className="detail-benefits">
                  <p>
                    <Truck size={18} />
                    {p.price >= 100 ? 'Free standard delivery' : 'Free shipping on orders of $100+'}
                  </p>
                  <p>
                    <ShieldCheck size={18} />
                    Secure account. Simulated payment.
                  </p>
                </div>
                <div className="specifications">
                  <h2>The details</h2>
                  {p.specifications.split('|').map((s, i) => {
                    const [name, ...value] = s.split(':');
                    return (
                      <div key={i}>
                        <span>{name}</span>
                        <strong>{value.join(':')}</strong>
                      </div>
                    );
                  })}
                  <div>
                    <span>SKU</span>
                    <strong>{p.sku}</strong>
                  </div>
                </div>
              </div>
            </div>
            {recommendations.length > 0 && (
              <section className="home-section">
                <SectionTitle title="You may also like" to="/products" />
                <div className="product-grid">
                  {recommendations.map((x) => (
                    <ProductCard key={x.id} product={x} onAdd={add} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </DataState>
    </div>
  );
}
