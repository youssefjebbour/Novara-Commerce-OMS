import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Package, ArrowRight } from 'lucide-react';
import { useAuth } from '../../shared/Auth';
import { ErrorMessage, Field, Loading, PageHeader, Empty } from '../../shared/UI';
import { api, errorMessage, media, money } from '../../shared/api';
import { useCart, useCartProducts } from './CartContext';
import { Summary } from './Cart';
export default function Checkout() {
  const values = useCartProducts(),
    { cart, clear } = useCart(),
    { user } = useAuth(),
    navigate = useNavigate();
  const [method, setMethod] = useState('CARD'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const requestRef = useRef(null);
  async function place(e) {
    e.preventDefault();
    if (busy || values.invalid) return;
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const request = {
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      address: {
        recipient: f.recipient,
        phone: f.phone,
        line1: f.line1,
        line2: f.line2,
        city: f.city,
        region: f.region,
        postalCode: f.postalCode,
        country: f.country,
      },
      paymentMethod: method,
      simulation: f.simulation || 'SUCCESS',
    };
    const signature = JSON.stringify(request);
    if (requestRef.current?.signature !== signature)
      requestRef.current = { signature, key: crypto.randomUUID() };
    try {
      const { data } = await api.post('/orders', { ...request, idempotencyKey: requestRef.current.key });
      clear();
      navigate(`/account/orders/${data.id}?placed=1`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (values.loading) return <Loading />;
  if (!cart.length)
    return (
      <div className="store-container inner-page">
        <Empty
          title="Your bag is empty"
          text="Choose something for your setup before checking out."
          action={
            <Link className="button primary" to="/products">
              Browse products
            </Link>
          }
        />
      </div>
    );
  return (
    <div className="store-container inner-page checkout">
      <div className="breadcrumbs">
        <Link to="/cart">Shopping bag</Link>
        <span>/</span>
        <span>Checkout</span>
      </div>
      <PageHeader title="Make it yours." description="A few details, and we’ll take it from here." />
      <ErrorMessage message={values.error || error} />
      {values.invalid && (
        <ErrorMessage message="Some items are no longer available in the requested quantity. Return to your bag to update them." />
      )}
      <form onSubmit={place} className="two-col">
        <div className="stack">
          <section className="panel">
            <h2>Your information</h2>
            <p className="muted">
              Signed in as <strong>{user.email}</strong>
            </p>
            <Field
              label="Recipient name"
              name="recipient"
              defaultValue={user.name}
              autoComplete="name"
              required
              maxLength={100}
            />
            <Field
              label="Phone number"
              name="phone"
              type="tel"
              defaultValue={user.phone || ''}
              autoComplete="tel"
              required
              maxLength={30}
            />
          </section>
          <section className="panel">
            <h2>Where should we send it?</h2>
            <Field
              label="Street address"
              name="line1"
              autoComplete="address-line1"
              required
              maxLength={255}
            />
            <Field
              label="Apartment, suite, etc. (optional)"
              name="line2"
              autoComplete="address-line2"
              maxLength={100}
            />
            <div className="form-grid">
              <Field label="City" name="city" autoComplete="address-level2" required maxLength={100} />
              <Field
                label="State / region"
                name="region"
                autoComplete="address-level1"
                required
                maxLength={100}
              />
              <Field
                label="Postal code"
                name="postalCode"
                autoComplete="postal-code"
                required
                maxLength={20}
              />
              <Field
                label="Country"
                name="country"
                autoComplete="country-name"
                defaultValue="United States"
                required
                maxLength={80}
              />
            </div>
          </section>
          <section className="panel">
            <h2>Payment method</h2>
            <p className="muted small">This is a demonstration checkout. No money is charged.</p>
            <label className={`payment-choice ${method === 'CARD' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="CARD"
                checked={method === 'CARD'}
                onChange={() => setMethod('CARD')}
              />
              <CreditCard size={21} />
              <div>
                <strong>Card payment</strong>
                <p>Simulated approval. No card details required.</p>
              </div>
            </label>
            <label className={`payment-choice ${method === 'COD' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={method === 'COD'}
                onChange={() => setMethod('COD')}
              />
              <Package size={21} />
              <div>
                <strong>Cash on delivery</strong>
                <p>Payment is simulated when delivery is completed.</p>
              </div>
            </label>
            {method === 'CARD' && (
              <Field label="Demo payment outcome">
                <select name="simulation">
                  <option value="SUCCESS">Approve payment</option>
                  <option value="DECLINE">Decline payment (try the failure flow)</option>
                </select>
              </Field>
            )}
          </section>
        </div>
        <div className="checkout-summary">
          <Summary values={values}>
            <div className="checkout-items">
              {values.items
                .filter((i) => i.product)
                .map((i) => (
                  <div key={i.productId}>
                    <img src={media(i.product.images[0])} alt={i.product.name} />
                    <span>
                      {i.product.name}
                      <small>Qty {i.quantity}</small>
                    </span>
                    <strong>{money(i.product.price * i.quantity)}</strong>
                  </div>
                ))}
            </div>
            <button
              className="primary full"
              type="submit"
              disabled={busy || values.invalid || !!values.error}
            >
              {busy ? 'Placing your order…' : 'Place order'}
              <ArrowRight size={16} />
            </button>
          </Summary>
          <p className="checkout-terms">
            By placing this demo order, you acknowledge that payment and shipping are simulated.
          </p>
        </div>
      </form>
    </div>
  );
}
