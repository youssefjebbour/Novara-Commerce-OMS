import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole, Trash2, Truck } from 'lucide-react';
import { Empty, ErrorMessage, Loading, PageHeader, Quantity } from '../../shared/UI';
import { money, media } from '../../shared/api';
import { useCart, useCartProducts } from './CartContext';
export function Summary({ values, children }) {
  return (
    <section className="panel cart-summary">
      <h2>Order summary</h2>
      <div className="summary-lines">
        <div>
          <span>Subtotal</span>
          <strong>{money(values.subtotal)}</strong>
        </div>
        <div>
          <span>Shipping</span>
          <strong>{values.shipping ? money(values.shipping) : 'Free'}</strong>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{money(values.total)}</strong>
        </div>
      </div>
      <p className="small muted">USD. No additional tax in this demonstration.</p>
      {children}
      <p className="secure-note">
        <LockKeyhole size={14} />
        Simulated payments. No card details needed.
      </p>
    </section>
  );
}
export default function Cart() {
  const { remove, quantity, count } = useCart(),
    values = useCartProducts();
  return (
    <div className="store-container inner-page">
      <PageHeader
        title="Your shopping bag"
        description={`${count} ${count === 1 ? 'item' : 'items'}, chosen by you.`}
      />
      {values.loading ? (
        <Loading />
      ) : values.error ? (
        <ErrorMessage message={values.error} />
      ) : !values.items.length ? (
        <Empty
          title="Make room for something good"
          text="Your bag is empty. Find the next addition to your everyday setup."
          action={
            <Link className="button primary" to="/products">
              Explore the collection
              <ArrowRight size={16} />
            </Link>
          }
        />
      ) : (
        <div className="two-col">
          <div className="stack">
            <div className="panel cart-items">
              {values.items.map((i) => (
                <div className="cart-item" key={i.productId}>
                  {i.product ? (
                    <>
                      <Link to={`/products/${i.productId}`}>
                        <img src={media(i.product.images[0])} alt={i.product.name} />
                      </Link>
                      <div>
                        <Link to={`/products/${i.productId}`}>
                          <h3>{i.product.name}</h3>
                        </Link>
                        <p>
                          {i.product.category.name} · {i.product.sku}
                        </p>
                        <span className="small muted">{money(i.product.price)} each</span>
                        {i.quantity > i.product.stock && (
                          <p className="stock out">Only {i.product.stock} available. Update your bag.</p>
                        )}
                        <Quantity
                          value={i.quantity}
                          max={Math.min(i.product.stock, 99)}
                          onChange={(q) => quantity(i.productId, q)}
                        />
                      </div>
                      <div className="cart-line-price">
                        <strong>{money((Math.round(i.product.price * 100) * i.quantity) / 100)}</strong>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${i.product.name}`}
                          onClick={() => remove(i.productId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>This product is no longer available.</p>
                      <button onClick={() => remove(i.productId)}>Remove unavailable product</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <Link className="back-link" to="/products">
              <ArrowLeft size={16} />
              Keep exploring
            </Link>
          </div>
          <div className="stack">
            <Summary values={values}>
              {values.invalid ? (
                <p className="error-box">Update unavailable quantities before checkout.</p>
              ) : (
                <Link className="button primary full" to="/checkout">
                  Continue to checkout
                  <ArrowRight size={16} />
                </Link>
              )}
            </Summary>
            <div className="delivery-note">
              <Truck size={20} />
              <p>
                {values.subtotal >= 100
                  ? 'Your order qualifies for free shipping.'
                  : `You’re ${money(100 - values.subtotal)} away from free shipping.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
