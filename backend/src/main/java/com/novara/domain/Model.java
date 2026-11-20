package com.novara.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Persistence model. Entities never cross the REST boundary; see api.Views. */
public final class Model {

  private Model() {}

  public enum Role {
    ADMIN,
    MANAGER,
    STAFF,
    CUSTOMER,
  }

  public enum OrderStatus {
    PENDING,
    CONFIRMED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED,
  }

  public enum PaymentStatus {
    PENDING,
    PAID,
    FAILED,
    REFUNDED,
  }

  public enum PaymentMethod {
    CARD,
    COD,
  }

  public enum ShipmentStatus {
    CREATED,
    IN_TRANSIT,
    DELIVERED,
  }

  @MappedSuperclass
  public abstract static class Base {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false)
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "AppUser")
  @Table(name = "users")
  public static class User extends Base {

    @Column(nullable = false, unique = true, length = 254)
    public String email;

    @Column(nullable = false)
    public String passwordHash;

    @Column(nullable = false, length = 100)
    public String name;

    @Column(length = 30)
    public String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public Role role;

    @Column(nullable = false)
    public boolean active = true;
  }

  @Entity(name = "AuthSession")
  @Table(name = "auth_sessions")
  public static class Session extends Base {

    @ManyToOne(optional = false)
    public User user;

    @Column(nullable = false, unique = true, length = 64)
    public String refreshHash;

    @Column(nullable = false)
    public Instant expiresAt;

    @Column(nullable = false)
    public boolean revoked;
  }

  @Entity
  @Table(name = "addresses")
  public static class Address extends Base {

    @ManyToOne(optional = false)
    public User user;

    @Column(nullable = false, length = 100)
    public String recipient;

    @Column(nullable = false, length = 30)
    public String phone;

    @Column(nullable = false)
    public String line1;

    @Column(length = 100)
    public String line2;

    @Column(nullable = false, length = 100)
    public String city;

    @Column(nullable = false, length = 100)
    public String region;

    @Column(nullable = false, length = 20)
    public String postalCode;

    @Column(nullable = false, length = 80)
    public String country;
  }

  @Entity
  @Table(name = "categories")
  public static class Category extends Base {

    @Column(nullable = false, unique = true, length = 80)
    public String name;

    @Column(nullable = false, unique = true, length = 80)
    public String slug;
  }

  @Entity(name = "Product")
  @Table(name = "products")
  public static class Product extends Base {

    @Column(nullable = false, unique = true, length = 80)
    public String sku;

    @Column(nullable = false, length = 160)
    public String name;

    @Column(nullable = false, length = 5000)
    public String description;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal price;

    @Column(precision = 12, scale = 2)
    public BigDecimal compareAtPrice;

    @ManyToOne(optional = false)
    public Category category;

    @Column(nullable = false)
    public boolean active = true;

    @Column(nullable = false)
    public boolean featured;

    @Column(nullable = false, length = 2000)
    public String specifications;

    @ElementCollection
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    @Column(name = "url", length = 500)
    public List<String> images = new ArrayList<>();
  }

  @Entity(name = "Inventory")
  @Table(name = "inventory")
  public static class Inventory extends Base {

    @OneToOne(optional = false)
    @JoinColumn(unique = true)
    public Product product;

    @Column(nullable = false)
    public int quantity;

    @Column(nullable = false)
    public int lowStockThreshold = 10;

    @Version
    public long version;
  }

  @Entity
  @Table(name = "inventory_movements")
  public static class Movement extends Base {

    @ManyToOne(optional = false)
    public Product product;

    @ManyToOne
    public User actor;

    public Long orderId;

    @Column(nullable = false)
    public int delta;

    @Column(nullable = false)
    public int balanceAfter;

    @Column(nullable = false, length = 255)
    public String reason;
  }

  @Entity(name = "CustomerOrder")
  @Table(
    name = "orders",
    uniqueConstraints = @UniqueConstraint(columnNames = { "customer_id", "idempotency_key" })
  )
  public static class Order extends Base {

    @Column(nullable = false, unique = true, length = 40)
    public String number;

    @ManyToOne(optional = false)
    public User customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal subtotal;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal shipping;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal total;

    @Column(nullable = false)
    public boolean stockAllocated;

    @Column(nullable = false, length = 80)
    public String idempotencyKey;

    @Column(nullable = false, length = 64)
    public String requestHash;

    @ManyToOne(optional = false)
    public Address address;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    public List<OrderItem> items = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL)
    public Payment payment;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL)
    public Shipment shipment;
  }

  @Entity
  @Table(name = "order_items")
  public static class OrderItem extends Base {

    @ManyToOne(optional = false)
    public Order order;

    @ManyToOne(optional = false)
    public Product product;

    @Column(nullable = false, length = 160)
    public String productName;

    @Column(nullable = false, length = 80)
    public String sku;

    @Column(nullable = false)
    public int quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal unitPrice;
  }

  @Entity
  @Table(name = "payments")
  public static class Payment extends Base {

    @OneToOne(optional = false)
    @JoinColumn(unique = true)
    public Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public PaymentStatus status;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Column(nullable = false, length = 50)
    public String reference;
  }

  @Entity
  @Table(name = "payment_events")
  public static class PaymentEvent extends Base {

    @ManyToOne(optional = false)
    public Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public PaymentStatus status;

    @Column(nullable = false, length = 255)
    public String note;
  }

  @Entity
  @Table(name = "shipments")
  public static class Shipment extends Base {

    @OneToOne(optional = false)
    @JoinColumn(unique = true)
    public Order order;

    @Column(nullable = false, unique = true, length = 50)
    public String trackingNumber;

    @Column(nullable = false, length = 80)
    public String carrier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public ShipmentStatus status = ShipmentStatus.CREATED;

    @Column(nullable = false)
    public LocalDate estimatedDelivery;
  }

  @Entity
  @Table(name = "order_status_history")
  public static class History extends Base {

    @ManyToOne(optional = false)
    public Order order;

    @ManyToOne(optional = false)
    public User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public OrderStatus status;

    @Column(nullable = false, length = 255)
    public String note;
  }

  @Entity
  @Table(name = "newsletter_subscriptions")
  public static class Subscription extends Base {

    @Column(nullable = false, unique = true, length = 254)
    public String email;
  }
}
