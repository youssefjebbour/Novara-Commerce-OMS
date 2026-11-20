import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useApi, useDebounce } from '../../shared/hooks';
import { api, date, money, errorMessage, label } from '../../shared/api';
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
import { useAuth } from '../../shared/Auth';
export function Customers() {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    query = useApi('/admin/customers', { q: useDebounce(search), page });
  return (
    <>
      <PageHeader title="Customers" description="The people on the other side of every order." />
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search customers"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
        <DataState query={query}>
          {(data) => (
            <>
              <p className="table-count">{data.totalElements} customers</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email address</th>
                      <th>Phone</th>
                      <th>Registered</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link className="person-cell" to={`/customers/${c.id}`}>
                            <span
                              className="avatar"
                              style={{ background: `hsl(${(c.id * 67) % 360} 30% 91%)`, color: '#364452' }}
                            >
                              {c.name
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            {c.name}
                          </Link>
                        </td>
                        <td>{c.email}</td>
                        <td>{c.phone || '—'}</td>
                        <td>{date(c.createdAt)}</td>
                        <td>
                          <Link className="text-button" to={`/customers/${c.id}`}>
                            View customer
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.content.length && <Empty title="No customers found" text="Try a different search." />}
              <Pagination data={data} onPage={setPage} />
            </>
          )}
        </DataState>
      </section>
    </>
  );
}
export function CustomerDetail() {
  const { id } = useParams(),
    query = useApi(`/admin/customers/${id}`);
  return (
    <>
      <Link className="back-link" to="/customers">
        <ArrowLeft size={15} />
        All customers
      </Link>
      <DataState query={query}>
        {(d) => (
          <>
            <PageHeader
              title={d.customer.name}
              description={`Customer since ${date(d.customer.createdAt)}`}
            />
            <div className="two-col">
              <section className="panel">
                <h2>Order history</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.orders.content.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <Link to={`/orders/${o.id}`}>{o.number}</Link>
                          </td>
                          <td>{date(o.createdAt)}</td>
                          <td>
                            <Status value={o.status} />
                          </td>
                          <td className="num">{money(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!d.orders.content.length && (
                  <p className="muted">This customer hasn’t placed an order yet.</p>
                )}
              </section>
              <section className="panel">
                <h2>Contact information</h2>
                <div className="contact-info">
                  <strong>{d.customer.name}</strong>
                  <p>{d.customer.email}</p>
                  <p>{d.customer.phone || 'No phone number on profile'}</p>
                </div>
                {d.addresses[0] && (
                  <>
                    <h3>Latest shipping address</h3>
                    <address>
                      {d.addresses[0].line1}
                      <br />
                      {d.addresses[0].line2}
                      <br />
                      {d.addresses[0].city}, {d.addresses[0].region} {d.addresses[0].postalCode}
                      <br />
                      {d.addresses[0].country}
                      <br />
                      {d.addresses[0].phone}
                    </address>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
export function Users() {
  const query = useApi('/admin/users', { size: 100 }),
    { user } = useAuth(),
    [modal, setModal] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    toast = useToast();
  return (
    <>
      <PageHeader title="Team & access" description="The right access for every person on your team.">
        <button
          className="primary"
          onClick={() => {
            setModal('new');
            setError('');
          }}
        >
          <Plus size={16} />
          Add team member
        </button>
      </PageHeader>
      <section className="panel">
        <DataState query={query}>
          {(data) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.content
                    .filter((u) => u.role !== 'CUSTOMER')
                    .map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="person-cell">
                            <span className="avatar">
                              {u.name
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            {u.name}
                            {u.id === user.id && <small className="muted">You</small>}
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{label(u.role)}</td>
                        <td>
                          <Status value={u.active ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td>
                          <button
                            disabled={u.id === user.id}
                            onClick={() => {
                              setModal(u);
                              setError('');
                            }}
                          >
                            Edit access
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
      <section className="panel permissions-panel">
        <h2>Role permissions</h2>
        <div>
          <p>
            <strong>Admin</strong>Full access, including team and role management.
          </p>
          <p>
            <strong>Manager</strong>Orders, products, inventory, customers, payments, and reports.
          </p>
          <p>
            <strong>Staff</strong>View orders, progress fulfillment, and manage shipments.
          </p>
          <p>
            <strong>Customer</strong>Storefront account and their own orders only.
          </p>
        </div>
      </section>
      {modal && (
        <Modal
          title={modal === 'new' ? 'Add team member' : `Edit ${modal.name}`}
          onClose={() => setModal(null)}
        >
          <ErrorMessage message={error} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = Object.fromEntries(new FormData(e.currentTarget));
              try {
                if (modal === 'new') await api.post('/admin/users', f);
                else await api.patch(`/admin/users/${modal.id}`, { role: f.role, active: f.active === 'on' });
                query.reload();
                setModal(null);
                toast('Team access updated');
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {modal === 'new' && (
              <>
                <Field label="Full name" name="name" required maxLength={100} />
                <Field label="Email" name="email" type="email" required />
                <Field
                  label="Initial password"
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={72}
                  required
                  autoComplete="new-password"
                />
              </>
            )}
            <Field label="Role">
              <select name="role" defaultValue={modal.role || 'STAFF'}>
                <option>STAFF</option>
                <option>MANAGER</option>
                <option>ADMIN</option>
              </select>
            </Field>
            {modal !== 'new' && (
              <label className="check-label">
                <input name="active" type="checkbox" defaultChecked={modal.active} />
                Active account
              </label>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save access'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
