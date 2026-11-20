package com.novara.api;

import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

@Component
public class Views {

  private final Inventories inventory;
  private final Histories histories;
  private final PaymentEvents paymentEvents;

  public Views(Inventories i, Histories h, PaymentEvents p) {
    inventory = i;
    histories = h;
    paymentEvents = p;
  }

  public record PageView<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageView<T> of(Page<T> p) {
      return new PageView<>(
        p.getContent(),
        p.getNumber(),
        p.getSize(),
        p.getTotalElements(),
        p.getTotalPages()
      );
    }
  }

  public record UserView(
    Long id,
    String name,
    String email,
    String phone,
    Role role,
    boolean active,
    Instant createdAt
  ) {}

  public static UserView user(User u) {
    return new UserView(u.id, u.name, u.email, u.phone, u.role, u.active, u.createdAt);
  }

  public record CategoryView(Long id, String name, String slug) {}

  public static CategoryView category(Category c) {
    return new CategoryView(c.id, c.name, c.slug);
  }

  public record ProductView(
    Long id,
    String sku,
    String name,
    String description,
    BigDecimal price,
    BigDecimal compareAtPrice,
    CategoryView category,
    boolean active,
    boolean featured,
    String specifications,
    List<String> images,
    int stock,
    int lowStockThreshold,
    Instant createdAt
  ) {}

  public ProductView product(Product p) {
    var i = inventory.findByProductId(p.id).orElseThrow();
    return new ProductView(
      p.id,
      p.sku,
      p.name,
      p.description,
      p.price,
      p.compareAtPrice,
      category(p.category),
      p.active,
      p.featured,
      p.specifications,
      List.copyOf(p.images),
      i.quantity,
      i.lowStockThreshold,
      p.createdAt
    );
  }

  public record AddressView(
    Long id,
    String recipient,
    String phone,
    String line1,
    String line2,
    String city,
    String region,
    String postalCode,
    String country
  ) {}

  public static AddressView address(Address a) {
    return new AddressView(
      a.id,
      a.recipient,
      a.phone,
      a.line1,
      a.line2,
      a.city,
      a.region,
      a.postalCode,
      a.country
    );
  }

  public record ItemView(
    Long productId,
    String name,
    String sku,
    String image,
    int quantity,
    BigDecimal unitPrice,
    BigDecimal total
  ) {}

  public record PaymentEventView(PaymentStatus status, String note, Instant createdAt) {}

  public record PaymentView(
    Long id,
    Long orderId,
    String orderNumber,
    PaymentMethod method,
    PaymentStatus status,
    BigDecimal amount,
    String reference,
    Instant createdAt,
    List<PaymentEventView> history
  ) {}

  public PaymentView payment(Payment p) {
    return new PaymentView(
      p.id,
      p.order.id,
      p.order.number,
      p.method,
      p.status,
      p.amount,
      p.reference,
      p.createdAt,
      paymentEvents
        .findByPaymentIdOrderByCreatedAtAsc(p.id)
        .stream()
        .map(e -> new PaymentEventView(e.status, e.note, e.createdAt))
        .toList()
    );
  }

  public record ShipmentView(
    Long id,
    Long orderId,
    String orderNumber,
    String trackingNumber,
    String carrier,
    ShipmentStatus status,
    LocalDate estimatedDelivery,
    AddressView address
  ) {}

  public static ShipmentView shipment(Shipment s) {
    return s == null
      ? null
      : new ShipmentView(
          s.id,
          s.order.id,
          s.order.number,
          s.trackingNumber,
          s.carrier,
          s.status,
          s.estimatedDelivery,
          address(s.order.address)
        );
  }

  public record HistoryView(OrderStatus status, String note, String actor, Instant createdAt) {}

  public record OrderView(
    Long id,
    String number,
    UserView customer,
    OrderStatus status,
    BigDecimal subtotal,
    BigDecimal shipping,
    BigDecimal total,
    AddressView address,
    List<ItemView> items,
    PaymentView payment,
    ShipmentView shipment,
    List<HistoryView> history,
    Instant createdAt
  ) {}

  public OrderView order(Order o) {
    return new OrderView(
      o.id,
      o.number,
      user(o.customer),
      o.status,
      o.subtotal,
      o.shipping,
      o.total,
      address(o.address),
      o.items
        .stream()
        .map(i ->
          new ItemView(
            i.product.id,
            i.productName,
            i.sku,
            i.product.images.isEmpty() ? "" : i.product.images.getFirst(),
            i.quantity,
            i.unitPrice,
            i.unitPrice.multiply(BigDecimal.valueOf(i.quantity))
          )
        )
        .toList(),
      payment(o.payment),
      shipment(o.shipment),
      histories
        .findByOrderIdOrderByCreatedAtAsc(o.id)
        .stream()
        .map(h -> new HistoryView(h.status, h.note, h.actor.name, h.createdAt))
        .toList(),
      o.createdAt
    );
  }

  public record MovementView(
    Long id,
    Long productId,
    String productName,
    String sku,
    int delta,
    int balanceAfter,
    String reason,
    String actor,
    Long orderId,
    Instant createdAt
  ) {}

  public static MovementView movement(Movement m) {
    return new MovementView(
      m.id,
      m.product.id,
      m.product.name,
      m.product.sku,
      m.delta,
      m.balanceAfter,
      m.reason,
      m.actor == null ? "System" : m.actor.name,
      m.orderId,
      m.createdAt
    );
  }
}
