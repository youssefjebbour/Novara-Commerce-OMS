import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../shared/hooks';
import { api, date, dateTime, errorMessage, money, label } from '../../shared/api';
import {
  DataState,
  Empty,
  ErrorMessage,
  Modal,
  PageHeader,
  Pagination,
  Status,
  useToast,
} from '../../shared/UI';
export function Payments() {
  const [page, setPage] = useState(0),
    [status, setStatus] = useState(''),
    [selected, setSelected] = useState(null),
    query = useApi('/admin/payments', { page, status: status || undefined });
  return (
    <>
      <PageHeader title="Payments" description="A clear record of every simulated transaction." />
      <div className="notice">
        Demo payments only. No card numbers or financial credentials are collected.
      </div>
      <section className="panel">
        <div className="toolbar">
          <select
            aria-label="Filter payment status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All payment statuses</option>
            {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <DataState query={query}>
          {(data) => (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Order</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="num">Amount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((p) => (
                      <tr key={p.id}>
                        <td>{p.reference}</td>
                        <td>
                          <Link to={`/orders/${p.orderId}`}>{p.orderNumber}</Link>
                        </td>
                        <td>{p.method === 'CARD' ? 'Simulated card' : 'Cash on delivery'}</td>
                        <td>
                          <Status value={p.status} />
                        </td>
                        <td>{date(p.createdAt)}</td>
                        <td className="num">{money(p.amount)}</td>
                        <td>
                          <button className="text-button" onClick={() => setSelected(p)}>
                            History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.content.length && (
                <Empty title="No payments match" text="Choose another payment status." />
              )}
              <Pagination data={data} onPage={setPage} />
            </>
          )}
        </DataState>
      </section>
      {selected && (
        <Modal title="Payment history" onClose={() => setSelected(null)}>
          <p className="muted">
            {selected.reference} · {money(selected.amount)}
          </p>
          <ol className="timeline">
            {selected.history.map((e, i) => (
              <li key={i}>
                <span className="timeline-dot" />
                <div>
                  <strong>{e.note}</strong>
                  <p>{dateTime(e.createdAt)}</p>
                </div>
                <Status value={e.status} />
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </>
  );
}
export function Shipments() {
  const [page, setPage] = useState(0),
    query = useApi('/admin/shipments', { page }),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    toast = useToast();
  return (
    <>
      <PageHeader title="Shipments" description="The last mile, with every detail in view.">
        <Link className="button primary" to="/orders?status=PROCESSING">
          Prepare an order
        </Link>
      </PageHeader>
      <section className="panel">
        <DataState query={query}>
          {(data) => (
            <>
              <p className="table-count">{data.totalElements} shipments</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tracking number</th>
                      <th>Order</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Est. delivery</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.trackingNumber}</strong>
                          <p>{s.carrier}</p>
                        </td>
                        <td>
                          <Link to={`/orders/${s.orderId}`}>{s.orderNumber}</Link>
                        </td>
                        <td>
                          {s.address.recipient}
                          <p>
                            {s.address.city}, {s.address.country}
                          </p>
                        </td>
                        <td>
                          <Status value={s.status} />
                        </td>
                        <td>{date(s.estimatedDelivery)}</td>
                        <td>
                          {s.status !== 'DELIVERED' && (
                            <button
                              onClick={() => {
                                setSelected(s);
                                setError('');
                              }}
                            >
                              {s.status === 'CREATED' ? 'Dispatch' : 'Complete delivery'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.content.length && (
                <Empty
                  title="Nothing on the road yet"
                  text="Create a shipment from a processing order to get started."
                  action={
                    <Link className="button" to="/orders?status=PROCESSING">
                      View processing orders
                    </Link>
                  }
                />
              )}
              <Pagination data={data} onPage={setPage} />
            </>
          )}
        </DataState>
      </section>
      {selected && (
        <Modal
          title={selected.status === 'CREATED' ? 'Dispatch shipment' : 'Complete delivery'}
          onClose={() => setSelected(null)}
        >
          <p>
            Update <strong>{selected.trackingNumber}</strong> to{' '}
            {selected.status === 'CREATED' ? 'in transit' : 'delivered'}. The order status will update at the
            same time.
          </p>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button onClick={() => setSelected(null)}>Back</button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.patch(`/admin/shipments/${selected.id}/status`, {
                    status: selected.status === 'CREATED' ? 'IN_TRANSIT' : 'DELIVERED',
                  });
                  query.reload();
                  setSelected(null);
                  toast('Shipment and order updated');
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Updating…' : 'Update shipment'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
