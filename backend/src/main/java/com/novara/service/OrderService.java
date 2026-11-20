package com.novara.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novara.api.*;
import com.novara.api.Views.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import com.novara.security.AuthService;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class OrderService {

  private final Orders orders;
  private final Products products;
  private final Inventories inventories;
  private final Users users;
  private final Addresses addresses;
  private final Payments payments;
  private final PaymentEvents events;
  private final Shipments shipments;
  private final Histories histories;
  private final CatalogService catalog;
  private final Views views;
  private final ObjectMapper json;

  public OrderService(
    Orders o,
    Products p,
    Inventories i,
    Users u,
    Addresses a,
    Payments pay,
    PaymentEvents e,
    Shipments s,
    Histories h,
    CatalogService c,
    Views v,
    ObjectMapper j
  ) {
    orders = o;
    products = p;
    inventories = i;
    users = u;
    addresses = a;
    payments = pay;
    events = e;
    shipments = s;
    histories = h;
    catalog = c;
    views = v;
    json = j;
  }

  @Transactional
  public OrderView checkout(Long userId, Requests.Checkout r) {
    // Serialize requests per customer so identical idempotency keys cannot race.
    User customer = users.lock(userId).orElseThrow(ApiException::unauthorized);
    if (customer.role != Role.CUSTOMER) throw ApiException.denied();
    String fingerprint;
    try {
      fingerprint = AuthService.hash(json.writeValueAsString(r));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
    var existing = orders.findByCustomerIdAndIdempotencyKey(userId, r.idempotencyKey());
    if (existing.isPresent()) {
      if (!existing.get().requestHash.equals(fingerprint)) throw ApiException.conflict(
        "This checkout key was already used for a different request"
      );
      return views.order(existing.get());
    }
    Map<Long, Integer> quantities = new TreeMap<>();
    for (var item : r.items()) quantities.merge(item.productId(), item.quantity(), Integer::sum);
    Order order = new Order();
    order.customer = customer;
    order.number =
      "NV-" +
      LocalDate.now(ZoneOffset.UTC).toString().replace("-", "") +
      "-" +
      UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    order.idempotencyKey = r.idempotencyKey();
    order.requestHash = fingerprint;
    order.subtotal = BigDecimal.ZERO;
    for (var entry : quantities.entrySet()) {
      if (entry.getValue() > 99) throw ApiException.bad("Maximum quantity per product is 99");
      Product p = products.lock(entry.getKey()).orElseThrow(() -> ApiException.missing("Product"));
      if (!p.active) throw ApiException.conflict(p.name + " is no longer available");
      if (
        inventories.lockByProductId(p.id).orElseThrow().quantity < entry.getValue()
      ) throw ApiException.conflict("Insufficient stock for " + p.name);
      OrderItem item = new OrderItem();
      item.order = order;
      item.product = p;
      item.productName = p.name;
      item.sku = p.sku;
      item.quantity = entry.getValue();
      item.unitPrice = p.price;
      order.items.add(item);
      order.subtotal = order.subtotal.add(p.price.multiply(BigDecimal.valueOf(item.quantity)));
    }
    order.shipping =
      order.subtotal.compareTo(new BigDecimal("100")) >= 0 ? new BigDecimal("0.00") : new BigDecimal("9.95");
    order.total = order.subtotal.add(order.shipping);
    order.address = saveAddress(customer, r.address());
    orders.save(order);
    Payment pay = new Payment();
    pay.order = order;
    pay.amount = order.total;
    pay.method = r.paymentMethod();
    pay.reference = "SIM-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT);
    pay.status =
      r.paymentMethod() == PaymentMethod.COD
        ? PaymentStatus.PENDING
        : r.simulation() == Requests.Simulation.SUCCESS
          ? PaymentStatus.PAID
          : PaymentStatus.FAILED;
    order.payment = payments.save(pay);
    event(
      pay,
      pay.status == PaymentStatus.FAILED
        ? "Simulated card declined; inventory not reserved"
        : pay.status == PaymentStatus.PAID
          ? "Simulated card approved"
          : "Cash on delivery; collection pending"
    );
    if (pay.status != PaymentStatus.FAILED) allocate(order, customer);
    history(order, customer, "Order placed on the online store");
    orders.flush();
    return views.order(order);
  }

  private Address saveAddress(User user, Requests.AddressInput r) {
    Address a = new Address();
    a.user = user;
    a.recipient = r.recipient();
    a.phone = r.phone();
    a.line1 = r.line1();
    a.line2 = r.line2();
    a.city = r.city();
    a.region = r.region();
    a.postalCode = r.postalCode();
    a.country = r.country();
    return addresses.save(a);
  }

  private void allocate(Order o, User actor) {
    for (var item : o.items
      .stream()
      .sorted(Comparator.comparing(i -> i.product.id))
      .toList()) {
      Product p = products.lock(item.product.id).orElseThrow();
      if (!p.active) throw ApiException.conflict(p.name + " is no longer available");
      catalog.move(p, -item.quantity, "Order allocation", actor, o.id);
    }
    o.stockAllocated = true;
  }

  public OrderView get(Long id, Long userId, boolean admin) {
    Order o = orders.findById(id).orElseThrow(() -> ApiException.missing("Order"));
    if (!admin && !o.customer.id.equals(userId)) throw ApiException.missing("Order");
    return views.order(o);
  }

  public PageView<OrderView> list(
    Long customer,
    String q,
    OrderStatus status,
    PaymentStatus payment,
    LocalDate from,
    LocalDate to,
    int page,
    int size,
    String sort
  ) {
    if (from != null && to != null && from.isAfter(to)) throw ApiException.bad(
      "Start date must not follow end date"
    );
    return PageView.of(
      orders
        .findAll(
          (root, query, cb) -> {
            var ps = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (customer != null) ps.add(cb.equal(root.get("customer").get("id"), customer));
            if (q != null && !q.isBlank()) ps.add(
              cb.or(
                cb.like(cb.lower(root.get("number")), CatalogService.like(q), '\\'),
                cb.like(cb.lower(root.get("customer").get("name")), CatalogService.like(q), '\\'),
                cb.like(cb.lower(root.get("customer").get("email")), CatalogService.like(q), '\\')
              )
            );
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (payment != null) ps.add(cb.equal(root.get("payment").get("status"), payment));
            if (from != null) ps.add(
              cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay().toInstant(ZoneOffset.UTC))
            );
            if (to != null) ps.add(
              cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC))
            );
            return cb.and(ps.toArray(jakarta.persistence.criteria.Predicate[]::new));
          },
          CatalogService.page(page, size, sort, Set.of("createdAt", "total", "number", "status"))
        )
        .map(views::order)
    );
  }

  public static boolean canTransition(OrderStatus from, OrderStatus to) {
    return switch (from) {
      case PENDING -> to == OrderStatus.CONFIRMED;
      case CONFIRMED -> to == OrderStatus.PROCESSING;
      case PROCESSING -> to == OrderStatus.SHIPPED;
      case SHIPPED -> to == OrderStatus.DELIVERED;
      default -> false;
    };
  }

  @Transactional
  public OrderView transition(Long id, Requests.Transition r, Long actorId) {
    Order o = orders.lock(id).orElseThrow(() -> ApiException.missing("Order"));
    User actor = users.findById(actorId).orElseThrow();
    if (!canTransition(o.status, r.status())) throw ApiException.conflict(
      "Cannot move an order from " + o.status + " to " + r.status()
    );
    if (o.payment.status == PaymentStatus.FAILED || !o.stockAllocated) throw ApiException.conflict(
      "Successful payment or cash-on-delivery allocation is required"
    );
    if (r.status() == OrderStatus.SHIPPED && o.shipment == null) throw ApiException.conflict(
      "Create a shipment before dispatching this order"
    );
    o.status = r.status();
    if (o.status == OrderStatus.SHIPPED) o.shipment.status = ShipmentStatus.IN_TRANSIT;
    if (o.status == OrderStatus.DELIVERED) {
      o.shipment.status = ShipmentStatus.DELIVERED;
      if (o.payment.method == PaymentMethod.COD && o.payment.status == PaymentStatus.PENDING) {
        o.payment.status = PaymentStatus.PAID;
        event(o.payment, "Simulated cash collected on delivery");
      }
    }
    history(o, actor, r.note());
    return views.order(o);
  }

  @Transactional
  public OrderView cancel(Long id, String reason, Long actorId, boolean customerRequest) {
    Order o = orders.lock(id).orElseThrow(() -> ApiException.missing("Order"));
    if (customerRequest && !o.customer.id.equals(actorId)) throw ApiException.missing("Order");
    if (o.status == OrderStatus.CANCELLED) return views.order(o);
    if (
      o.status == OrderStatus.SHIPPED ||
      o.status == OrderStatus.DELIVERED ||
      (customerRequest && o.status == OrderStatus.PROCESSING)
    ) throw ApiException.conflict("This order can no longer be cancelled");
    User actor = users.findById(actorId).orElseThrow();
    if (o.stockAllocated) {
      String movementReason = "Cancellation: " + reason;
      for (var i : o.items
        .stream()
        .sorted(Comparator.comparing(x -> x.product.id))
        .toList())
        catalog.move(
          products.lock(i.product.id).orElseThrow(),
          i.quantity,
          movementReason.substring(0, Math.min(255, movementReason.length())),
          actor,
          o.id
        );
      o.stockAllocated = false;
    }
    o.status = OrderStatus.CANCELLED;
    if (o.payment.status == PaymentStatus.PAID) {
      o.payment.status = PaymentStatus.REFUNDED;
      event(o.payment, "Simulated refund after cancellation");
    } else {
      event(o.payment, "Order cancelled; no funds collected");
    }
    // A label created before dispatch is voided by removing the unused shipment.
    if (o.shipment != null) {
      shipments.delete(o.shipment);
      o.shipment = null;
    }
    history(o, actor, reason);
    return views.order(o);
  }

  @Transactional
  public OrderView retryPayment(Long id, Long customer, Requests.Simulation result) {
    Order o = orders.lock(id).orElseThrow(() -> ApiException.missing("Order"));
    if (!o.customer.id.equals(customer)) throw ApiException.missing("Order");
    if (
      o.status != OrderStatus.PENDING ||
      o.payment.method != PaymentMethod.CARD ||
      o.payment.status != PaymentStatus.FAILED
    ) throw ApiException.conflict("Only a declined, pending card order can be retried");
    if (result == Requests.Simulation.SUCCESS) {
      allocate(o, o.customer);
      o.payment.status = PaymentStatus.PAID;
    }
    event(
      o.payment,
      result == Requests.Simulation.SUCCESS ? "Simulated retry approved" : "Simulated retry declined"
    );
    return views.order(o);
  }

  @Transactional
  public ShipmentView createShipment(Requests.ShipmentInput r, Long actorId) {
    Order o = orders.lock(r.orderId()).orElseThrow(() -> ApiException.missing("Order"));
    if (o.status != OrderStatus.PROCESSING) throw ApiException.conflict(
      "Shipments can only be created for processing orders"
    );
    if (o.shipment != null) throw ApiException.conflict("A shipment already exists for this order");
    Shipment s = new Shipment();
    s.order = o;
    s.carrier = r.carrier();
    s.estimatedDelivery = r.estimatedDelivery();
    s.trackingNumber =
      "NVX" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT);
    o.shipment = shipments.save(s);
    history(o, users.findById(actorId).orElseThrow(), "Shipping label created: " + s.trackingNumber);
    return Views.shipment(s);
  }

  @Transactional
  public ShipmentView updateShipment(Long id, ShipmentStatus status, Long actorId) {
    Long orderId = shipments.orderId(id).orElseThrow(() -> ApiException.missing("Shipment"));
    if (status == ShipmentStatus.CREATED) throw ApiException.conflict(
      "A shipment cannot move back to created"
    );
    transition(
      orderId,
      new Requests.Transition(
        status == ShipmentStatus.IN_TRANSIT ? OrderStatus.SHIPPED : OrderStatus.DELIVERED,
        "Shipment updated to " + status
      ),
      actorId
    );
    return Views.shipment(shipments.findById(id).orElseThrow());
  }

  public PageView<ShipmentView> shipments(int page, int size) {
    return PageView.of(
      shipments
        .findAll(CatalogService.page(page, size, "createdAt,desc", Set.of("createdAt")))
        .map(Views::shipment)
    );
  }

  public PageView<PaymentView> payments(PaymentStatus status, int page, int size) {
    return PageView.of(
      payments
        .findAll(
          (root, q, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status),
          CatalogService.page(page, size, "createdAt,desc", Set.of("createdAt"))
        )
        .map(views::payment)
    );
  }

  public PaymentView payment(Long id) {
    return views.payment(payments.findById(id).orElseThrow(() -> ApiException.missing("Payment")));
  }

  private void history(Order o, User actor, String note) {
    History h = new History();
    h.order = o;
    h.actor = actor;
    h.status = o.status;
    h.note = note;
    histories.save(h);
  }

  private void event(Payment p, String note) {
    PaymentEvent e = new PaymentEvent();
    e.payment = p;
    e.status = p.status;
    e.note = note;
    events.save(e);
  }
}
