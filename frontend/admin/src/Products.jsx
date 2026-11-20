import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../../shared/hooks';
import { api, errorMessage, money, media } from '../../shared/api';
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
export function Products() {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [active, setActive] = useState(''),
    [page, setPage] = useState(0),
    [categoryModal, setCategoryModal] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    toast = useToast();
  const categories = useApi('/categories'),
    query = useApi('/admin/products', {
      q: useDebounce(search),
      category: category || undefined,
      active: active || undefined,
      page,
      size: 10,
    });
  return (
    <>
      <PageHeader title="Products" description="A considered collection, kept up to date.">
        <button onClick={() => setCategoryModal(true)}>Add category</button>
        <Link className="button primary" to="/products/new">
          <Plus size={16} />
          Add product
        </Link>
      </PageHeader>
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search products"
              value={search}
              placeholder="Search product name or SKU"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Product status"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <DataState query={query}>
          {(data) => (
            <>
              <p className="table-count">{data.totalElements} products</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th className="num">Inventory</th>
                      <th>Category</th>
                      <th className="num">Price</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link className="product-cell" to={`/products/${p.id}`}>
                            <img src={media(p.images[0])} alt={p.name} />
                            <div>
                              <strong>{p.name}</strong>
                              <p>{p.sku}</p>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <Status value={p.active ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td className="num">
                          <span className={p.stock <= p.lowStockThreshold ? 'stock-low' : ''}>
                            {p.stock} available
                          </span>
                        </td>
                        <td>{p.category.name}</td>
                        <td className="num">{money(p.price)}</td>
                        <td>
                          <Link className="text-button" to={`/products/${p.id}`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.content.length && (
                <Empty
                  title="No products found"
                  text="Try another search or add a product to the collection."
                />
              )}
              <Pagination data={data} onPage={setPage} />
            </>
          )}
        </DataState>
      </section>
      {categoryModal && (
        <Modal title="Add category" onClose={() => setCategoryModal(false)}>
          <ErrorMessage message={error} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api.post('/admin/categories', Object.fromEntries(new FormData(e.currentTarget)));
                categories.reload();
                setCategoryModal(false);
                toast('Category added');
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Category name" name="name" required maxLength={80} />
            <Field
              label="URL slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="desk-accessories"
              maxLength={80}
            />
            <button className="primary" disabled={busy}>
              Create category
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function ProductEditor() {
  const { id } = useParams(),
    isNew = !id,
    query = useApi(id ? `/admin/products/${id}` : null),
    categories = useApi('/categories'),
    navigate = useNavigate(),
    toast = useToast(),
    [images, setImages] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [deactivate, setDeactivate] = useState(false);
  useEffect(() => {
    if (query.data) setImages(query.data.images);
  }, [query.data]);
  async function upload(e) {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setError('');
    try {
      const f = new FormData();
      f.append('file', e.target.files[0]);
      const { data } = await api.post('/admin/uploads', f);
      setImages((i) => [...i, data.url]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }
  async function save(e) {
    e.preventDefault();
    setError('');
    if (!images.length) {
      setError('Add at least one product image.');
      return;
    }
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      body = {
        sku: f.sku,
        name: f.name,
        description: f.description,
        price: Number(f.price),
        compareAtPrice: f.compareAtPrice ? Number(f.compareAtPrice) : null,
        categoryId: Number(f.categoryId),
        active: f.active === 'on',
        featured: f.featured === 'on',
        specifications: f.specifications,
        images,
      };
    try {
      if (isNew) await api.post('/admin/products', body);
      else await api.put(`/admin/products/${id}`, body);
      toast(isNew ? 'Product created. Add stock in Inventory.' : 'Product updated');
      navigate('/products');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function form(p = {}) {
    return (
      <form onSubmit={save}>
        <PageHeader
          title={isNew ? 'Add a product' : p.name}
          description={isNew ? 'Give your next great find a place in the collection.' : p.sku}
        >
          <button type="button" onClick={() => navigate('/products')}>
            Discard
          </button>
          <button className="primary" disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Save product'}
          </button>
        </PageHeader>
        <ErrorMessage message={error} />
        <div className="two-col">
          <div className="stack">
            <section className="panel">
              <h2>Product information</h2>
              <Field label="Product name" name="name" required maxLength={160} defaultValue={p.name} />
              <Field label="Description">
                <textarea name="description" defaultValue={p.description} required maxLength={5000} />
              </Field>
              <Field label="Specifications">
                <textarea
                  name="specifications"
                  defaultValue={p.specifications}
                  placeholder="Display: 27-inch IPS|Connectivity: USB-C|Finish: Silver"
                  required
                  maxLength={2000}
                />
              </Field>
              <p className="small muted">
                Separate specifications with | and each label from its value with a colon.
              </p>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Product images</h2>
                <span>{images.length} of 8</span>
              </div>
              <div className="image-editor">
                {images.map((src, i) => (
                  <div key={`${src}-${i}`}>
                    <img src={media(src)} alt={`Product view ${i + 1}`} />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() => setImages((imgs) => imgs.filter((_, n) => n !== i))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <label className="upload-control">
                <Upload size={18} />
                {uploading ? 'Uploading…' : 'Upload PNG or JPEG'}
                <input
                  aria-label="Upload product image"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={upload}
                  disabled={uploading || images.length >= 8}
                />
              </label>
              <p className="small muted">Up to 5 MB per image. The first image is the cover.</p>
              <div className="image-url">
                <input
                  aria-label="Product image URL"
                  type="url"
                  placeholder="Or paste an HTTPS image URL"
                  id="image-url"
                />
                <button
                  type="button"
                  disabled={images.length >= 8}
                  onClick={() => {
                    const input = document.getElementById('image-url');
                    if (!input.value.startsWith('https://')) {
                      setError('Image URL must start with https://');
                      return;
                    }
                    setImages((i) => [...i, input.value]);
                    input.value = '';
                  }}
                >
                  Add URL
                </button>
              </div>
            </section>
            <section className="panel">
              <h2>Pricing</h2>
              <div className="form-grid">
                <Field
                  label="Price (USD)"
                  name="price"
                  type="number"
                  min="0.01"
                  max="999999.99"
                  step="0.01"
                  required
                  defaultValue={p.price}
                />
                <Field
                  label="Original price (optional)"
                  name="compareAtPrice"
                  type="number"
                  min="0.01"
                  max="999999.99"
                  step="0.01"
                  defaultValue={p.compareAtPrice}
                />
              </div>
            </section>
          </div>
          <div className="stack">
            <section className="panel">
              <h2>Organization</h2>
              <Field
                label="SKU"
                name="sku"
                required
                pattern="[A-Za-z0-9_-]+"
                maxLength={80}
                defaultValue={p.sku}
              />
              <Field label="Category">
                <select name="categoryId" defaultValue={p.category?.id || ''} required>
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="check-label">
                <input type="checkbox" name="active" defaultChecked={p.active ?? true} />
                Active on storefront
              </label>
              <label className="check-label">
                <input type="checkbox" name="featured" defaultChecked={p.featured ?? false} />
                Featured collection
              </label>
            </section>
            <section className="panel">
              <h2>Inventory</h2>
              <p className="muted">
                {isNew
                  ? 'New products start with zero stock. Add units in Inventory after saving.'
                  : `${p.stock} units currently available. Stock changes are recorded in Inventory.`}
              </p>
              <Link className="text-button" to="/inventory">
                Manage inventory
              </Link>
            </section>
            {!isNew && p.active && (
              <section className="panel">
                <h2>Archive product</h2>
                <p className="muted small">
                  Remove this product from the storefront while preserving order history.
                </p>
                <button type="button" className="danger" onClick={() => setDeactivate(true)}>
                  Deactivate product
                </button>
              </section>
            )}
          </div>
        </div>
      </form>
    );
  }
  return (
    <>
      <Link to="/products" className="back-link">
        <ArrowLeft size={15} />
        All products
      </Link>
      {isNew ? form() : <DataState query={query}>{form}</DataState>}
      {deactivate && (
        <Modal title="Deactivate product?" onClose={() => setDeactivate(false)}>
          <p>This product will no longer be available for new orders.</p>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button onClick={() => setDeactivate(false)}>Keep active</button>
            <button
              className="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.delete(`/admin/products/${id}`);
                  toast('Product deactivated');
                  navigate('/products');
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Deactivate
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
