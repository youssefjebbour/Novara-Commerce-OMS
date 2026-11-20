import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Monitor,
  Laptop,
  Keyboard,
  Headphones,
  Mouse,
  Cable,
  Truck,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import { useApi } from '../../shared/hooks';
import { DataState, ProductCard, SectionTitle } from '../../shared/UI';
import { media, money } from '../../shared/api';
import { useCart } from './CartContext';
const icons = {
  Monitors: Monitor,
  Laptops: Laptop,
  Keyboards: Keyboard,
  Audio: Headphones,
  Mice: Mouse,
  Accessories: Cable,
};
export default function Home() {
  const featured = useApi('/products', { featured: true, size: 4, sort: 'id,asc' }),
    latest = useApi('/products', { size: 4, sort: 'createdAt,desc' }),
    categories = useApi('/categories'),
    best = useApi('/products/best-sellers'),
    audio = featured.data?.content.find((p) => p.sku === 'NV-AUD-MAX'),
    { add } = useCart();
  return (
    <div className="store-container home">
      <section className="store-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Thoughtfully chosen. Ready for you.</p>
          <h1>
            A better
            <br />
            everyday setup.
          </h1>
          <p>
            The right tech makes all the difference. <br />
            Find your next favorite for work, play, and everything in between.
          </p>
          <Link className="button primary" to="/products">
            Find your upgrade
            <ArrowRight size={16} />
          </Link>
          <span className="hero-footnote">Considered essentials. Extraordinary possibilities.</span>
        </div>
        <div className="hero-photo">
          <img
            src={media('/media/catalog/workspace.jpg')}
            alt="A bright desk with a laptop, notebook and thoughtfully arranged everyday tools"
            fetchPriority="high"
          />
          <div className="hero-caption">
            <span>Make room for better.</span>
            <Link to="/products?category=2">
              Explore laptops
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="category-strip" aria-label="Browse categories">
        {categories.data?.map((c) => {
          const Icon = icons[c.name] || Cable;
          return (
            <Link key={c.id} to={`/products?category=${c.id}`}>
              <Icon size={25} strokeWidth={1.4} />
              <span>{c.name}</span>
              <ArrowRight size={13} />
            </Link>
          );
        })}
      </section>
      <section className="home-section">
        <SectionTitle title="A few of our favorites" to="/products" link="Shop the collection" />
        <DataState query={featured}>
          {(data) => (
            <div className="product-grid">
              {data.content.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={add} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="feature-banner">
        <div>
          <h2>A little less noise.</h2>
          <p>
            A lot more of what you love. <br />
            Discover audio that makes the everyday sound better.
          </p>
          <Link className="button" to="/products?category=4">
            Explore audio
            <ArrowRight size={16} />
          </Link>
        </div>
        <img
          src={media('/media/catalog/nv-aud-max-0.webp')}
          alt="Silver Apple AirPods Max over-ear headphones"
          loading="lazy"
        />
        <div className="banner-product">
          <span>Apple AirPods Max</span>
          <strong>{audio ? money(audio.price) : 'Explore the collection'}</strong>
          <span>Comfort in every detail.</span>
        </div>
      </section>
      <section className="home-section">
        <SectionTitle
          title="New to the collection"
          to="/products?sort=createdAt,desc"
          link="See what’s new"
        />
        <DataState query={latest}>
          {(data) => (
            <div className="product-grid">
              {data.content.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={add} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="home-section">
        <SectionTitle title="Best sellers" to="/products" link="Explore all products" />
        <DataState query={best}>
          {(data) => (
            <div className="product-grid">
              {data.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={add} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="benefits" aria-label="Shopping benefits">
        <div>
          <Truck size={24} />
          <div>
            <h3>A good delivery, on us</h3>
            <p>Free shipping when you spend $100.</p>
          </div>
        </div>
        <div>
          <PackageCheck size={24} />
          <div>
            <h3>Follow every step</h3>
            <p>Order updates, right in your account.</p>
          </div>
        </div>
        <div>
          <ShieldCheck size={24} />
          <div>
            <h3>A little peace of mind</h3>
            <p>Clear pricing. No payment details stored.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
