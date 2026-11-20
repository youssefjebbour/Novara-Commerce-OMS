package com.novara.api;

import com.novara.api.Views.*;
import com.novara.domain.Model.*;
import com.novara.security.AuthService.Identity;
import com.novara.service.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final CatalogService catalog;
  private final OrderService orders;
  private final PeopleService people;
  private final AnalyticsService analytics;

  public AdminController(CatalogService c, OrderService o, PeopleService p, AnalyticsService a) {
    catalog = c;
    orders = o;
    people = p;
    analytics = a;
  }

  @GetMapping("/orders")
  public PageView<OrderView> orders(
    @RequestParam(required = false) String q,
    @RequestParam(required = false) OrderStatus status,
    @RequestParam(required = false) PaymentStatus paymentStatus,
    @RequestParam(required = false) LocalDate from,
    @RequestParam(required = false) LocalDate to,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "createdAt,desc") String sort
  ) {
    return orders.list(null, q, status, paymentStatus, from, to, page, size, sort);
  }

  @GetMapping("/orders/{id}")
  public OrderView order(@PathVariable Long id) {
    return orders.get(id, null, true);
  }

  @PatchMapping("/orders/{id}/status")
  public OrderView status(
    @PathVariable Long id,
    @Valid @RequestBody Requests.Transition r,
    @AuthenticationPrincipal Identity actor
  ) {
    return orders.transition(id, r, actor.userId());
  }

  @PostMapping("/orders/{id}/cancel")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public OrderView cancel(
    @PathVariable Long id,
    @Valid @RequestBody Requests.Cancel r,
    @AuthenticationPrincipal Identity actor
  ) {
    return orders.cancel(id, r.reason(), actor.userId(), false);
  }

  @GetMapping("/products")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PageView<ProductView> products(
    @RequestParam(required = false) String q,
    @RequestParam(required = false) Long category,
    @RequestParam(required = false) Boolean active,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size,
    @RequestParam(defaultValue = "createdAt,desc") String sort
  ) {
    return catalog.list(q, category, null, null, null, active, page, size, sort, true);
  }

  @GetMapping("/products/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ProductView product(@PathVariable Long id) {
    return catalog.get(id, true);
  }

  @PostMapping("/products")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public ProductView createProduct(@Valid @RequestBody Requests.ProductInput r) {
    return catalog.save(null, r);
  }

  @PutMapping("/products/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ProductView updateProduct(@PathVariable Long id, @Valid @RequestBody Requests.ProductInput r) {
    return catalog.save(id, r);
  }

  @DeleteMapping("/products/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deactivate(@PathVariable Long id) {
    catalog.deactivate(id);
  }

  @PostMapping("/categories")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  @ResponseStatus(HttpStatus.CREATED)
  public CategoryView category(@Valid @RequestBody Requests.CategoryInput r) {
    return catalog.createCategory(r);
  }

  @GetMapping("/inventory")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public List<ProductView> inventory(
    @RequestParam(required = false) String q,
    @RequestParam(defaultValue = "false") boolean lowStock
  ) {
    return catalog.inventory(q, lowStock);
  }

  @GetMapping("/inventory/movements")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PageView<MovementView> movements(
    @RequestParam(required = false) Long productId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return catalog.movements(productId, page, size);
  }

  @PostMapping("/inventory/adjustments")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ProductView adjust(
    @Valid @RequestBody Requests.Adjustment r,
    @AuthenticationPrincipal Identity actor
  ) {
    return catalog.adjust(r, actor.userId());
  }

  @GetMapping("/customers")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PageView<UserView> customers(
    @RequestParam(required = false) String q,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "15") int size
  ) {
    return people.list(q, Role.CUSTOMER, page, size);
  }

  @GetMapping("/customers/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public Map<String, Object> customer(@PathVariable Long id) {
    return people.customer(id);
  }

  @GetMapping("/payments")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PageView<PaymentView> payments(
    @RequestParam(required = false) PaymentStatus status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "15") int size
  ) {
    return orders.payments(status, page, size);
  }

  @GetMapping("/payments/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PaymentView payment(@PathVariable Long id) {
    return orders.payment(id);
  }

  @GetMapping("/shipments")
  public PageView<ShipmentView> shipments(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "15") int size
  ) {
    return orders.shipments(page, size);
  }

  @PostMapping("/shipments")
  @ResponseStatus(HttpStatus.CREATED)
  public ShipmentView shipment(
    @Valid @RequestBody Requests.ShipmentInput r,
    @AuthenticationPrincipal Identity actor
  ) {
    return orders.createShipment(r, actor.userId());
  }

  @PatchMapping("/shipments/{id}/status")
  public ShipmentView shipmentStatus(
    @PathVariable Long id,
    @Valid @RequestBody Requests.ShipmentUpdate r,
    @AuthenticationPrincipal Identity actor
  ) {
    return orders.updateShipment(id, r.status(), actor.userId());
  }

  @GetMapping({ "/analytics/overview", "/analytics/revenue", "/analytics/orders" })
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public Map<String, Object> analytics(@RequestParam(defaultValue = "30") int days) {
    return analytics.overview(days);
  }

  @GetMapping("/users")
  @PreAuthorize("hasRole('ADMIN')")
  public PageView<UserView> users(
    @RequestParam(required = false) String q,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return people.list(q, null, page, size);
  }

  @PostMapping("/users")
  @PreAuthorize("hasRole('ADMIN')")
  @ResponseStatus(HttpStatus.CREATED)
  public UserView createUser(@Valid @RequestBody Requests.UserInput r) {
    return people.create(r);
  }

  @PatchMapping("/users/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public UserView user(
    @PathVariable Long id,
    @Valid @RequestBody Requests.UserUpdate r,
    @AuthenticationPrincipal Identity actor
  ) {
    return people.update(id, r, actor.userId());
  }
}
