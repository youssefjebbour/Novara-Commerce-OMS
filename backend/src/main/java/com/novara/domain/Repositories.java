package com.novara.domain;

import com.novara.domain.Model.*;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public final class Repositories {

  private Repositories() {}

  public interface Users extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    long countByRole(Role role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id=:id")
    Optional<User> lock(@Param("id") Long id);
  }

  public interface Sessions extends JpaRepository<Session, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Session> findByRefreshHash(String hash);
  }

  public interface Addresses extends JpaRepository<Address, Long> {
    List<Address> findByUserIdOrderByCreatedAtDesc(Long id);
  }

  public interface Categories extends JpaRepository<Category, Long> {}

  public interface Products extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    @Query(
      value = "SELECT p.* FROM products p JOIN order_items i ON i.product_id=p.id JOIN orders o ON o.id=i.order_id JOIN payments pay ON pay.order_id=o.id WHERE p.active=1 AND o.status<>'CANCELLED' AND pay.status<>'FAILED' GROUP BY p.id ORDER BY SUM(i.quantity) DESC,p.id LIMIT 4",
      nativeQuery = true
    )
    List<Product> bestSellers();

    boolean existsBySku(String sku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id=:id")
    Optional<Product> lock(@Param("id") Long id);
  }

  public interface Inventories extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByProductId(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.product.id=:id")
    Optional<Inventory> lockByProductId(@Param("id") Long id);
  }

  public interface Movements extends JpaRepository<Movement, Long>, JpaSpecificationExecutor<Movement> {}

  public interface Orders extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByCustomerIdAndIdempotencyKey(Long customerId, String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.id=:id")
    Optional<Order> lock(@Param("id") Long id);
  }

  public interface Payments extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {}

  public interface PaymentEvents extends JpaRepository<PaymentEvent, Long> {
    List<PaymentEvent> findByPaymentIdOrderByCreatedAtAsc(Long id);
  }

  public interface Shipments extends JpaRepository<Shipment, Long>, JpaSpecificationExecutor<Shipment> {
    @Query(value = "SELECT order_id FROM shipments WHERE id=:id", nativeQuery = true)
    Optional<Long> orderId(@Param("id") Long id);
  }

  public interface Histories extends JpaRepository<History, Long> {
    List<History> findByOrderIdOrderByCreatedAtAsc(Long id);
  }

  public interface Subscriptions extends JpaRepository<Subscription, Long> {
    boolean existsByEmail(String email);
  }
}
