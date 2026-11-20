import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UserRound, Package, MapPin, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../shared/Auth';
import { useApi } from '../../shared/hooks';
import { api, errorMessage, date, money } from '../../shared/api';
import {
  DataState,
  Empty,
  ErrorMessage,
  Field,
  PageHeader,
  Pagination,
  Status,
  useToast,
  Modal,
} from '../../shared/UI';
import { AddressCard, OrderHistory, OrderItems, PaymentCard, Tracking } from '../../shared/OrderView';
export function AccountLayout() {
  const { user, logout } = useAuth(),
    navigate = useNavigate();
  return (
    <div className="store-container inner-page">
      <PageHeader title="Your NOVARA" description={`Good to see you, ${user.name.split(' ')[0]}.`} />
      <div className="account-layout">
        <aside className="account-nav">
          <NavLink to="/account" end>
            <UserRound size={17} />
            Profile
          </NavLink>
          <NavLink to="/account/orders">
            <Package size={17} />
            Your orders
          </NavLink>
          <NavLink to="/account/addresses">
            <MapPin size={17} />
            Addresses
          </NavLink>
          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
export function Profile() {
  const { user, updateUser } = useAuth(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    toast = useToast();
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch('/me', Object.fromEntries(new FormData(e.currentTarget)));
      updateUser(data);
      toast('Profile updated');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel profile-panel">
      <h2>Personal information</h2>
      <p className="muted">The details that make this account yours.</p>
      <ErrorMessage message={error} />
      <form onSubmit={save}>
        <Field label="Full name" name="name" required maxLength={100} defaultValue={user.name} />
        <Field label="Email address" type="email" value={user.email} disabled />
        <Field label="Phone number" name="phone" type="tel" maxLength={30} defaultValue={user.phone || ''} />
        <button className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
export function MyOrders() {
  const [page, setPage] = useState(0),
    query = useApi('/orders/my-orders', { page });
  return (
    <>
      <h2>Your orders</h2>
      <DataState query={query}>
        {(data) =>
          data.content.length ? (
            <>
              <div className="stack">
                {data.content.map((o) => (
                  <Link className="panel customer-order" to={`/account/orders/${o.id}`} key={o.id}>
                    <div>
                      <strong>{o.number}</strong>
                      <p>
                        {date(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items
                      </p>
                    </div>
                    <Status value={o.status} />
                    <strong>{money(o.total)}</strong>
                    <ArrowRight size={17} />
                  </Link>
                ))}
              </div>
              <Pagination data={data} onPage={setPage} />
            </>
          ) : (
            <Empty
              title="Your next story starts here"
              text="Your orders will appear here once you find your next favorite."
              action={
                <Link className="button" to="/products">
                  Explore products
                </Link>
              }
            />
          )
        }
      </DataState>
    </>
  );
}
export function Addresses() {
  const query = useApi('/me/addresses');
  return (
    <>
      <h2>Shipping addresses</h2>
      <p className="muted">
        Addresses from your orders. Enter a new address at checkout whenever you need to.
      </p>
      <DataState query={query}>
        {(data) =>
          data.length ? (
            <div className="equal-col">
              {data.map((a) => (
                <AddressCard key={a.id} address={a} />
              ))}
            </div>
          ) : (
            <Empty
              title="Your address book starts here"
              text="Your shipping address will be saved when you place your first order."
            />
          )
        }
      </DataState>
    </>
  );
}
export function CustomerOrder() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    query = useApi(`/orders/${id}`),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [cancel, setCancel] = useState(false),
    toast = useToast();
  async function action(url, body) {
    setBusy(true);
    setError('');
    try {
      await api.post(url, body);
      query.reload();
      setCancel(false);
      toast('Order updated');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="store-container inner-page">
      <Link className="back-link" to="/account/orders">
        ← Your orders
      </Link>
      <DataState query={query}>
        {(o) => (
          <>
            {params.has('placed') && (
              <div className={`confirmation ${o.payment.status === 'FAILED' ? 'declined' : ''}`}>
                <CheckCircle2 size={30} />
                <div>
                  <h1>
                    {o.payment.status === 'FAILED'
                      ? 'Order saved. Payment needs attention.'
                      : 'Good things are on their way.'}
                  </h1>
                  <p>
                    {o.payment.status === 'FAILED'
                      ? 'Your simulated card was declined. Retry below to reserve your items.'
                      : `Thank you, ${o.customer.name.split(' ')[0]}. Your order is ${o.number}.`}
                  </p>
                </div>
              </div>
            )}
            <PageHeader title={o.number} description={`Placed ${date(o.createdAt)}`}>
              <Status value={o.status} />
              {['PENDING', 'CONFIRMED'].includes(o.status) && (
                <button onClick={() => setCancel(true)}>Cancel order</button>
              )}
            </PageHeader>
            <ErrorMessage message={error} />
            {o.payment.status === 'FAILED' && o.status === 'PENDING' && (
              <div className="notice">
                Payment was declined. Inventory is not reserved.
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => action(`/orders/${id}/payment`, { simulation: 'SUCCESS' })}
                >
                  Retry simulated payment
                </button>
              </div>
            )}
            <div className="two-col">
              <div className="stack">
                <Tracking order={o} />
                <OrderItems order={o} />
                <OrderHistory history={o.history} />
              </div>
              <div className="stack">
                <AddressCard address={o.address} />
                <PaymentCard payment={o.payment} />
              </div>
            </div>
            {cancel && (
              <Modal title="Cancel this order?" onClose={() => setCancel(false)}>
                <p>We’ll release reserved stock and simulate a refund if payment was received.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(`/orders/${id}/cancel`, { reason: new FormData(e.currentTarget).get('reason') });
                  }}
                >
                  <Field label="Reason" name="reason" required maxLength={200} />
                  <ErrorMessage message={error} />
                  <div className="form-actions">
                    <button type="button" onClick={() => setCancel(false)}>
                      Keep order
                    </button>
                    <button className="danger" disabled={busy}>
                      Confirm cancellation
                    </button>
                  </div>
                </form>
              </Modal>
            )}
          </>
        )}
      </DataState>
    </div>
  );
}
