import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, History } from 'lucide-react';
import { useApi, useDebounce } from '../../shared/hooks';
import { api, errorMessage, media, dateTime } from '../../shared/api';
import {
  DataState,
  Empty,
  ErrorMessage,
  Field,
  Modal,
  PageHeader,
  Pagination,
  useToast,
} from '../../shared/UI';
export default function Inventory() {
  const [params] = useSearchParams(),
    [low, setLow] = useState(params.get('lowStock') === 'true'),
    [search, setSearch] = useState(''),
    [tab, setTab] = useState('stock'),
    [page, setPage] = useState(0),
    [product, setProduct] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    toast = useToast();
  const query = useApi('/admin/inventory', { q: useDebounce(search), lowStock: low }),
    movements = useApi(tab === 'history' ? '/admin/inventory/movements' : null, { page, size: 15 });
  return (
    <>
      <PageHeader title="Inventory" description="Everything in its place. Every movement accounted for." />
      <div className="tabs">
        <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>
          Stock levels
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          Movement history
        </button>
      </div>
      <section className="panel">
        {tab === 'stock' ? (
          <>
            <div className="toolbar">
              <div className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search inventory"
                  placeholder="Search product or SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="check-label">
                <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />
                Low stock only
              </label>
            </div>
            <DataState query={query}>
              {(data) => (
                <>
                  <p className="table-count">{data.length} products</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="num">Available</th>
                          <th className="num">Low-stock threshold</th>
                          <th>Stock health</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="product-cell">
                                <img src={media(p.images[0])} alt={p.name} />
                                <div>
                                  <strong>{p.name}</strong>
                                  <p>{p.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="num">{p.stock}</td>
                            <td className="num">{p.lowStockThreshold}</td>
                            <td>
                              <span
                                className={`inventory-health ${p.stock <= p.lowStockThreshold ? 'low' : ''}`}
                              >
                                <i />
                                {p.stock === 0
                                  ? 'Out of stock'
                                  : p.stock <= p.lowStockThreshold
                                    ? 'Running low'
                                    : 'Healthy'}
                              </span>
                            </td>
                            <td className="num">
                              <button
                                onClick={() => {
                                  setProduct(p);
                                  setError('');
                                }}
                              >
                                <Plus size={14} />
                                Adjust stock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!data.length && (
                    <Empty
                      title="No matching products"
                      text="Try changing your search or low-stock filter."
                    />
                  )}
                </>
              )}
            </DataState>
          </>
        ) : (
          <DataState query={movements}>
            {(data) => (
              <>
                <p className="muted small">
                  Every stock change has a reason, an actor, and a resulting balance.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Date</th>
                        <th>Reason</th>
                        <th>Recorded by</th>
                        <th className="num">Change</th>
                        <th className="num">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.content.map((m) => (
                        <tr key={m.id}>
                          <td>
                            {m.productName}
                            <p>{m.sku}</p>
                          </td>
                          <td className="nowrap">{dateTime(m.createdAt)}</td>
                          <td>{m.reason}</td>
                          <td>{m.actor}</td>
                          <td className={`num ${m.delta > 0 ? 'positive' : 'muted'}`}>
                            {m.delta > 0 ? '+' : ''}
                            {m.delta}
                          </td>
                          <td className="num">{m.balanceAfter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.content.length && (
                  <Empty
                    title="No movements yet"
                    text="Stock adjustments and order allocations will appear here."
                  />
                )}
                <Pagination data={data} onPage={setPage} />
              </>
            )}
          </DataState>
        )}
      </section>
      {product && (
        <Modal title="Adjust stock" onClose={() => setProduct(null)}>
          <p>
            <strong>{product.name}</strong>
            <br />
            <span className="muted">{product.stock} units currently available</span>
          </p>
          <ErrorMessage message={error} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                await api.post('/admin/inventory/adjustments', {
                  productId: product.id,
                  delta: Number(f.get('delta')),
                  reason: f.get('reason'),
                });
                query.reload();
                movements.reload();
                setProduct(null);
                toast('Stock adjusted and movement recorded');
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Quantity change"
              name="delta"
              type="number"
              min={-product.stock}
              max={100000}
              required
              placeholder="e.g. 20 to add, -2 to remove"
            />
            <Field
              label="Reason"
              name="reason"
              required
              maxLength={200}
              placeholder="Supplier delivery, cycle count, damaged item…"
            />
            <div className="form-actions">
              <button type="button" onClick={() => setProduct(null)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Record adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
