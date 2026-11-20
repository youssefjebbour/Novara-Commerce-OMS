import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, ChevronRight, PackageCheck, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../shared/Auth';
import { useApi } from '../../shared/hooks';
import { DataState, PageHeader, Status } from '../../shared/UI';
import { money, date, media } from '../../shared/api';
import { Bars, StatusChart } from './Charts';
export default function Dashboard({ analytics = false }) {
  const { user } = useAuth();
  const [days, setDays] = useState(30),
    query = useApi(user.role === 'STAFF' ? null : '/admin/analytics/overview', { days }),
    recent = useApi(user.role === 'STAFF' ? null : '/admin/orders', { size: 5 }),
    low = useApi(user.role === 'STAFF' ? null : '/admin/inventory', { lowStock: true });
  if (user.role === 'STAFF') return <Navigate to="/orders" replace />;
  return (
    <>
      <PageHeader
        title={analytics ? 'Sales analytics' : 'Store overview'}
        description={
          analytics
            ? 'The story behind your sales, from orders to revenue.'
            : 'A clear view of your store. A good place to start.'
        }
      >
        <select aria-label="Analytics period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button
          className="icon-button refresh"
          aria-label="Refresh dashboard"
          onClick={() => {
            query.reload();
            recent.reload();
            low.reload();
          }}
        >
          <RefreshCw size={17} />
        </button>
      </PageHeader>
      <DataState query={query}>
        {(d) => (
          <>
            <div className="metrics">
              <Metric
                title="Total revenue"
                value={money(d.revenue)}
                note={`Paid orders · last ${days} days`}
              />
              <Metric
                title="Total orders"
                value={d.totalOrders}
                note={`${d.completedOrders} delivered in this period`}
              />
              <Metric
                title="Pending orders"
                value={d.pendingOrders}
                note="Awaiting confirmation"
                to="/orders?status=PENDING"
              />
              <Metric title="Customers" value={d.totalCustomers} note="Registered with your store" />
            </div>
            {!analytics && (
              <div className="attention-strip">
                <span>
                  <i />
                  <strong>{d.pendingOrders} orders</strong> are waiting for your attention
                </span>
                <Link to="/orders?status=PENDING">
                  Review orders
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
            <div className="dashboard-charts">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Revenue over time</h2>
                  <span>
                    USD · {date(d.from)} – {date(d.to)}
                  </span>
                </div>
                <Bars data={d.series} />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Orders over time</h2>
                  <span>{d.totalOrders} orders</span>
                </div>
                <Bars data={d.series} field="orders" />
              </section>
            </div>
            <div className="dashboard-middle">
              <section className="panel recent-orders">
                <div className="panel-heading">
                  <h2>{analytics ? 'Order distribution' : 'Recent orders'}</h2>
                  <Link to="/orders">
                    View orders
                    <ChevronRight size={14} />
                  </Link>
                </div>
                {analytics ? (
                  <StatusChart data={d.statuses} />
                ) : (
                  <DataState query={recent}>
                    {(data) => (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Order</th>
                              <th>Customer</th>
                              <th>Status</th>
                              <th className="num">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.content.map((o) => (
                              <tr key={o.id}>
                                <td>
                                  <Link to={`/orders/${o.id}`} title={o.number}>
                                    NV-{o.number.slice(-8)}
                                  </Link>
                                  <p>{date(o.createdAt)}</p>
                                </td>
                                <td>{o.customer.name}</td>
                                <td>
                                  <Status value={o.status} />
                                </td>
                                <td className="num">{money(o.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!data.content.length && <p className="muted">Your first order will appear here.</p>}
                      </div>
                    )}
                  </DataState>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Best-selling products</h2>
                  <span>Units sold</span>
                </div>
                <div className="best-sellers">
                  {d.bestSellers.map((p) => (
                    <Link to={`/products/${p.id}`} key={p.id}>
                      <img src={media(p.image)} alt={p.name} />
                      <div>
                        <strong>{p.name}</strong>
                        <p>{money(p.revenue)} in sales</p>
                      </div>
                      <b>{p.units}</b>
                    </Link>
                  ))}
                  {!d.bestSellers.length && <p className="muted">No products sold in this period.</p>}
                </div>
              </section>
            </div>
            <div className="dashboard-bottom">
              <section className="panel">
                <div className="panel-heading">
                  <h2>{analytics ? 'Fulfillment snapshot' : 'Order status'}</h2>
                  <span>{d.completedOrders} completed</span>
                </div>
                <StatusChart data={d.statuses} />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Inventory needs a look</h2>
                  <Link to="/inventory?lowStock=true">
                    View inventory
                    <ChevronRight size={14} />
                  </Link>
                </div>
                <p className="muted small">
                  {d.lowStock} active products are at or below their stock threshold.
                </p>
                <DataState query={low}>
                  {(data) => (
                    <div className="low-stock-list">
                      {data
                        .filter((p) => p.active)
                        .slice(0, 4)
                        .map((p) => (
                          <Link key={p.id} to="/inventory?lowStock=true">
                            <img src={media(p.images[0])} alt={p.name} />
                            <span>
                              <strong>{p.name}</strong>
                              <small>{p.sku}</small>
                            </span>
                            <b>{p.stock} left</b>
                            <ArrowUpRight size={15} />
                          </Link>
                        ))}
                      {!data.length && <p className="muted">Stock levels look healthy.</p>}
                    </div>
                  )}
                </DataState>
              </section>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
function Metric({ title, value, note, to }) {
  return (
    <div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>
        {to ? (
          <Link to={to}>
            {note}
            <ArrowRight size={12} />
          </Link>
        ) : (
          note
        )}
      </p>
    </div>
  );
}
