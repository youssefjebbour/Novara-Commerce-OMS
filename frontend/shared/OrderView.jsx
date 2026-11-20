import React from 'react';
import { Check, Package, Truck, MapPin, CreditCard } from 'lucide-react';
import { date, dateTime, label, money, media } from './api';
import { Status } from './UI';
export function OrderItems({ order }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Order items</h2>
        <span>{order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
      </div>
      <div className="order-items">
        {order.items.map((i) => (
          <div className="order-item" key={i.productId}>
            <img src={media(i.image)} alt={i.name} />
            <div>
              <strong>{i.name}</strong>
              <p>
                {i.sku} · Qty {i.quantity}
              </p>
            </div>
            <div className="num">
              <strong>{money(i.total)}</strong>
              <p>{money(i.unitPrice)} each</p>
            </div>
          </div>
        ))}
      </div>
      <div className="order-totals">
        <div>
          <span>Subtotal</span>
          <span>{money(order.subtotal)}</span>
        </div>
        <div>
          <span>Shipping</span>
          <span>{Number(order.shipping) === 0 ? 'Free' : money(order.shipping)}</span>
        </div>
        <div className="total">
          <span>Total</span>
          <strong>{money(order.total)}</strong>
        </div>
      </div>
    </section>
  );
}
export function AddressCard({ address: a }) {
  return (
    <section className="panel">
      <h2 className="with-icon">
        <MapPin size={18} />
        Shipping address
      </h2>
      <address>
        <strong>{a.recipient}</strong>
        <br />
        {a.line1}
        <br />
        {a.line2 && (
          <>
            {a.line2}
            <br />
          </>
        )}
        {a.city}, {a.region} {a.postalCode}
        <br />
        {a.country}
        <br />
        <span className="muted">{a.phone}</span>
      </address>
    </section>
  );
}
export function PaymentCard({ payment: p }) {
  return (
    <section className="panel">
      <h2 className="with-icon">
        <CreditCard size={18} />
        Payment
      </h2>
      <div className="key-values">
        <div>
          <span>Method</span>
          <strong>{p.method === 'CARD' ? 'Simulated card' : 'Cash on delivery'}</strong>
        </div>
        <div>
          <span>Status</span>
          <Status value={p.status} />
        </div>
        <div>
          <span>Amount</span>
          <strong>{money(p.amount)}</strong>
        </div>
        <div>
          <span>Reference</span>
          <span className="small">{p.reference}</span>
        </div>
      </div>
    </section>
  );
}
export function Tracking({ order: o }) {
  const stages = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const current = stages.indexOf(o.status);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2 className="with-icon">
          <Truck size={18} />
          Order tracking
        </h2>
        <Status value={o.status} />
      </div>
      {o.status === 'CANCELLED' ? (
        <p>
          This order has been cancelled.{' '}
          {o.payment.status === 'REFUNDED'
            ? 'Your simulated refund is complete.'
            : 'No payment was collected.'}
        </p>
      ) : (
        <div className="tracking-steps">
          {stages.map((s, i) => (
            <div className={i <= current ? 'done' : ''} key={s}>
              <span>{i <= current ? <Check size={15} /> : <Package size={15} />}</span>
              <p>{label(s)}</p>
            </div>
          ))}
        </div>
      )}
      {o.shipment ? (
        <div className="tracking-info">
          <div>
            <span>Carrier</span>
            <strong>{o.shipment.carrier}</strong>
          </div>
          <div>
            <span>Demo tracking number</span>
            <strong>{o.shipment.trackingNumber}</strong>
          </div>
          <div>
            <span>Estimated delivery</span>
            <strong>{date(o.shipment.estimatedDelivery)}</strong>
          </div>
        </div>
      ) : (
        o.status !== 'CANCELLED' && (
          <p className="muted small">Tracking details appear here when your order is packed for dispatch.</p>
        )
      )}
    </section>
  );
}
export function OrderHistory({ history }) {
  return (
    <section className="panel">
      <h2>Order activity</h2>
      <ol className="timeline">
        {[...history].reverse().map((h, i) => (
          <li key={i}>
            <span className="timeline-dot" />
            <div>
              <strong>{h.note}</strong>
              <p>
                {h.actor} · {dateTime(h.createdAt)}
              </p>
            </div>
            <Status value={h.status} />
          </li>
        ))}
      </ol>
    </section>
  );
}
