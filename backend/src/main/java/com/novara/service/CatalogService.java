package com.novara.service;

import com.novara.api.*;
import com.novara.api.Views.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CatalogService {

  private final Products products;
  private final Categories categories;
  private final Inventories inventories;
  private final Movements movements;
  private final Users users;
  private final Views views;

  public CatalogService(Products p, Categories c, Inventories i, Movements m, Users u, Views v) {
    products = p;
    categories = c;
    inventories = i;
    movements = m;
    users = u;
    views = v;
  }

  public static Pageable page(int page, int size, String sort, Set<String> allowed) {
    String[] bits = sort.split(",");
    String field = bits[0];
    if (!allowed.contains(field)) throw ApiException.bad("Unsupported sort field");
    if (page < 0 || size < 1 || size > 100) throw ApiException.bad(
      "Page must be nonnegative and size must be 1–100"
    );
    return PageRequest.of(
      page,
      size,
      Sort.by(
        bits.length > 1 && bits[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC,
        field
      ).and(Sort.by("id"))
    );
  }

  public static String like(String q) {
    return (
      "%" + q.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    );
  }

  public PageView<ProductView> list(
    String q,
    Long category,
    BigDecimal min,
    BigDecimal max,
    Boolean featured,
    Boolean active,
    int page,
    int size,
    String sort,
    boolean admin
  ) {
    Specification<Product> spec = (root, query, cb) -> {
      var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
      if (!admin) predicates.add(cb.isTrue(root.get("active")));
      else if (active != null) predicates.add(cb.equal(root.get("active"), active));
      if (q != null && !q.isBlank()) predicates.add(
        cb.or(
          cb.like(cb.lower(root.get("name")), like(q), '\\'),
          cb.like(cb.lower(root.get("sku")), like(q), '\\')
        )
      );
      if (category != null) predicates.add(cb.equal(root.get("category").get("id"), category));
      if (min != null) predicates.add(cb.greaterThanOrEqualTo(root.get("price"), min));
      if (max != null) predicates.add(cb.lessThanOrEqualTo(root.get("price"), max));
      if (featured != null) predicates.add(cb.equal(root.get("featured"), featured));
      return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
    };
    return PageView.of(
      products
        .findAll(spec, page(page, size, sort, Set.of("name", "price", "createdAt", "id")))
        .map(views::product)
    );
  }

  public ProductView get(Long id, boolean admin) {
    var p = products.findById(id).orElseThrow(() -> ApiException.missing("Product"));
    if (!admin && !p.active) throw ApiException.missing("Product");
    return views.product(p);
  }

  public List<CategoryView> categories() {
    return categories.findAll(Sort.by("id")).stream().map(Views::category).toList();
  }

  public List<ProductView> bestSellers() {
    return products.bestSellers().stream().map(views::product).toList();
  }

  @Transactional
  public CategoryView createCategory(Requests.CategoryInput r) {
    Category c = new Category();
    c.name = r.name().trim();
    c.slug = r.slug();
    return Views.category(categories.save(c));
  }

  @Transactional
  public ProductView save(Long id, Requests.ProductInput r) {
    Product p =
      id == null ? new Product() : products.lock(id).orElseThrow(() -> ApiException.missing("Product"));
    if (r.compareAtPrice() != null && r.compareAtPrice().compareTo(r.price()) < 0) throw ApiException.bad(
      "Original price must be at least the selling price"
    );
    for (String url : r.images())
      if (!url.startsWith("/media/") && !url.matches("https://[^\\s]+")) throw ApiException.bad(
        "Images must use HTTPS or an uploaded /media/ path"
      );
    p.sku = r.sku().toUpperCase(Locale.ROOT);
    p.name = r.name().trim();
    p.description = r.description();
    p.price = r.price();
    p.compareAtPrice = r.compareAtPrice();
    p.category = categories.findById(r.categoryId()).orElseThrow(() -> ApiException.missing("Category"));
    p.active = r.active();
    p.featured = r.featured();
    p.specifications = r.specifications();
    p.images.clear();
    p.images.addAll(r.images());
    products.saveAndFlush(p);
    if (id == null) {
      Inventory i = new Inventory();
      i.product = p;
      inventories.saveAndFlush(i);
    }
    return views.product(p);
  }

  @Transactional
  public void deactivate(Long id) {
    products.lock(id).orElseThrow(() -> ApiException.missing("Product")).active = false;
  }

  @Transactional
  public ProductView adjust(Requests.Adjustment r, Long actorId) {
    Product p = products.lock(r.productId()).orElseThrow(() -> ApiException.missing("Product"));
    if (r.delta() == 0) throw ApiException.bad("Adjustment cannot be zero");
    move(p, r.delta(), r.reason(), users.findById(actorId).orElseThrow(), null);
    return views.product(p);
  }

  /** Caller must hold the product row lock; order service locks products in ascending ID order. */
  public void move(Product p, int delta, String reason, User actor, Long orderId) {
    Inventory i = inventories.lockByProductId(p.id).orElseThrow();
    long balance = (long) i.quantity + delta;
    if (balance < 0) throw ApiException.conflict(
      "Insufficient stock for " + p.name + ". Available: " + i.quantity
    );
    if (balance > 1_000_000) throw ApiException.bad("Stock limit exceeded");
    i.quantity = (int) balance;
    inventories.save(i);
    Movement m = new Movement();
    m.product = p;
    m.delta = delta;
    m.balanceAfter = i.quantity;
    m.reason = reason;
    m.actor = actor;
    m.orderId = orderId;
    movements.save(m);
  }

  public PageView<MovementView> movements(Long productId, int page, int size) {
    return PageView.of(
      movements
        .findAll(
          (root, q, cb) ->
            productId == null ? cb.conjunction() : cb.equal(root.get("product").get("id"), productId),
          page(page, size, "createdAt,desc", Set.of("createdAt"))
        )
        .map(Views::movement)
    );
  }

  public List<ProductView> inventory(String q, boolean low) {
    return inventories
      .findAll()
      .stream()
      .filter(i -> !low || i.quantity <= i.lowStockThreshold)
      .filter(
        i ->
          q == null ||
          q.isBlank() ||
          (i.product.name + " " + i.product.sku).toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT))
      )
      .sorted(Comparator.comparingInt(i -> i.quantity))
      .map(i -> views.product(i.product))
      .toList();
  }
}
