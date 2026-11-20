import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, ArrowRight, Truck } from 'lucide-react';
import { useApi, useDebounce } from '../../shared/hooks';
import { api, date, money, errorMessage, label } from '../../shared/api';
import { useAuth } from '../../shared/Auth';
import {
  DataState,
  Empty,
  ErrorMessage,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Status,
  useToast,
} from '../../shared/UI';
import { AddressCard, OrderItems, PaymentCard, Tracking, OrderHistory } from '../../shared/OrderView';
export const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
export function Orders() {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get('q') || ''),
    debounced = useDebounce(search),
    page = Number(params.get('page') || 0),
    query = useApi('/admin/orders', { ...Object.fromEntries(params), q: debounced, page, size: 10 });
  function change(k, v) {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  }
  return (
    <>
      <PageHeader title="Orders" description="From the first click to the front door." />
      <div className="tabs">
        <button className={!params.get('status') ? 'active' : ''} onClick={() => change('status', '')}>
          All orders
        </button>
        {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((s) => (
          <button
            key={s}
            className={params.get('status') === s ? 'active' : ''}
            onClick={() => change('status', s)}
          >
            {label(s)}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search orders table"
              placeholder="Search order number or customer"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                change('page', '');
              }}
            />
          </div>
          <select
            aria-label="Order status"
            value={params.get('status') || ''}
            onChange={(e) => change('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {orderStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Payment status"
            value={params.get('paymentStatus') || ''}
            onChange={(e) => change('paymentStatus', e.target.value)}
          >
            <option value="">All payments</option>
            {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Orders from date"
            value={params.get('from') || ''}
            onChange={(e) => change('from', e.target.value)}
          />
          <input
            type="date"
            aria-label="Orders to date"
            value={params.get('to') || ''}
            onChange={(e) => change('to', e.target.value)}
          />
          <select
            aria-label="Sort orders"
            value={params.get('sort') || 'createdAt,desc'}
            onChange={(e) => change('sort', e.target.value)}
          >
            <option value="createdAt,desc">Newest first</option>
            <option value="createdAt,asc">Oldest first</option>
            <option value="total,desc">Highest total</option>
            <option value="total,asc">Lowest total</option>
          </select>
        </div>
        <DataState query={query}>
          {(data) => (
            <>
              <p className="table-count">{data.totalElements} orders</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Payment</th>
                      <th>Fulfillment</th>
                      <th className="num">Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/orders/${o.id}`}>{o.number}</Link>
                          <p>{o.items.reduce((s, i) => s + i.quantity, 0)} items</p>
                        </td>
                        <td>
                          {o.customer.name}
                          <p>{o.customer.email}</p>
                        </td>
                        <td className="nowrap">{date(o.createdAt)}</td>
                        <td>
                          <Status value={o.payment.status} />
                        </td>
                        <td>
                          <Status value={o.status} />
                        </td>
                        <td className="num">{money(o.total)}</td>
                        <td>
                          <Link className="row-action" to={`/orders/${o.id}`} aria-label={`Open ${o.number}`}>
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.content.length && (
                <Empty title="No orders match" text="Try another search or adjust the filters." />
              )}
              <Pagination data={data} onPage={(p) => change('page', p)} />
            </>
          )}
        </DataState>
      </section>
    </>
  );
}
const nextStatus = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};
const nextAction = {
  PENDING: 'Confirm order',
  CONFIRMED: 'Start processing',
  PROCESSING: 'Mark as shipped',
  SHIPPED: 'Mark as delivered',
};
export function OrderDetail() {
  const { id } = useParams(),
    query = useApi(`/admin/orders/${id}`),
    { user } = useAuth(),
    toast = useToast(),
    [modal, setModal] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function act(method, url, body) {
    setError('');
    setBusy(true);
    try {
      await api[method](url, body);
      query.reload();
      setModal(null);
      toast('Order updated');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/orders">
        <ArrowLeft size={15} />
        All orders
      </Link>
      <DataState query={query}>
        {(o) => (
          <>
            <PageHeader title={o.number} description={`${date(o.createdAt)} · Online store`}>
              <Status value={o.status} />
              {!['CANCELLED', 'SHIPPED', 'DELIVERED'].includes(o.status) && user.role !== 'STAFF' && (
                <button
                  className="danger"
                  onClick={() => {
                    setError('');
                    setModal('cancel');
                  }}
                >
                  Cancel order
                </button>
              )}
              {o.status === 'PROCESSING' && !o.shipment ? (
                <button
                  className="primary"
                  onClick={() => {
                    setError('');
                    setModal('shipment');
                  }}
                >
                  <Truck size={16} />
                  Create shipment
                </button>
              ) : (
                nextStatus[o.status] && (
                  <button
                    className="primary"
                    disabled={o.payment.status === 'FAILED' || busy}
                    onClick={() => {
                      setError('');
                      setModal('transition');
                    }}
                  >
                    {nextAction[o.status]}
                    <ArrowRight size={15} />
                  </button>
                )
              )}
            </PageHeader>
            <ErrorMessage message={error} />
            {o.payment.status === 'FAILED' && (
              <div className="notice">
                Payment was declined. The customer must retry payment before this order can be confirmed.
              </div>
            )}
            <div className="two-col admin-order-grid">
              <div className="stack">
                <OrderItems order={o} />
                <Tracking order={o} />
                <OrderHistory history={o.history} />
              </div>
              <div className="stack">
                <section className="panel">
                  <h2>Customer</h2>
                  <div className="customer-identity">
                    <span className="avatar">
                      {o.customer.name
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div>
                      <strong>{o.customer.name}</strong>
                      <p>{o.customer.email}</p>
                    </div>
                  </div>
                  {user.role !== 'STAFF' && (
                    <Link className="text-button" to={`/customers/${o.customer.id}`}>
                      View customer
                    </Link>
                  )}
                </section>
                <AddressCard address={o.address} />
                <PaymentCard payment={o.payment} />
              </div>
            </div>
            {modal && (
              <Modal
                title={
                  modal === 'cancel'
                    ? 'Cancel order'
                    : modal === 'shipment'
                      ? 'Create shipment'
                      : nextAction[o.status]
                }
                onClose={() => setModal(null)}
              >
                <ErrorMessage message={error} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    if (modal === 'shipment') act('post', '/admin/shipments', { ...f, orderId: o.id });
                    else if (modal === 'cancel')
                      act('post', `/admin/orders/${id}/cancel`, { reason: f.note });
                    else
                      act('patch', `/admin/orders/${id}/status`, {
                        status: nextStatus[o.status],
                        note: f.note,
                      });
                  }}
                >
                  {modal === 'shipment' ? (
                    <>
                      <p className="muted">A demo tracking number will be generated for this order.</p>
                      <Field
                        label="Carrier"
                        name="carrier"
                        required
                        maxLength={80}
                        defaultValue="NOVARA Express"
                      />
                      <Field
                        label="Estimated delivery"
                        name="estimatedDelivery"
                        type="date"
                        min={new Date().toLocaleDateString('en-CA')}
                        defaultValue={new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <p className="muted">
                        {modal === 'cancel'
                          ? 'Reserved stock will be restored and any paid amount will be refunded in the simulation.'
                          : `Move this order from ${label(o.status).toLowerCase()} to ${label(nextStatus[o.status]).toLowerCase()}.`}
                      </p>
                      <Field
                        label={modal === 'cancel' ? 'Cancellation reason' : 'Activity note'}
                        name="note"
                        required
                        maxLength={200}
                        defaultValue={modal === 'cancel' ? '' : nextAction[o.status]}
                      />
                    </>
                  )}
                  <div className="form-actions">
                    <button type="button" onClick={() => setModal(null)}>
                      Back
                    </button>
                    <button className={modal === 'cancel' ? 'danger' : 'primary'} disabled={busy}>
                      {busy
                        ? 'Saving…'
                        : modal === 'shipment'
                          ? 'Create shipment'
                          : modal === 'cancel'
                            ? 'Confirm cancellation'
                            : 'Update order'}
                    </button>
                  </div>
                </form>
              </Modal>
            )}
          </>
        )}
      </DataState>
    </>
  );
}
