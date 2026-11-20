package com.novara.api;

import com.novara.api.Views.*;
import com.novara.security.AuthService.Identity;
import com.novara.service.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class StoreController {

  private final CatalogService catalog;
  private final OrderService orders;
  private final PeopleService people;

  public StoreController(CatalogService c, OrderService o, PeopleService p) {
    catalog = c;
    orders = o;
    people = p;
  }

  @GetMapping({ "/products", "/products/search" })
  public PageView<ProductView> products(
    @RequestParam(required = false) String q,
    @RequestParam(required = false) Long category,
    @RequestParam(required = false) BigDecimal minPrice,
    @RequestParam(required = false) BigDecimal maxPrice,
    @RequestParam(required = false) Boolean featured,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size,
    @RequestParam(defaultValue = "createdAt,desc") String sort
  ) {
    return catalog.list(q, category, minPrice, maxPrice, featured, null, page, size, sort, false);
  }

  @GetMapping("/products/{id}")
  public ProductView product(@PathVariable Long id) {
    return catalog.get(id, false);
  }

  @GetMapping("/products/best-sellers")
  public List<ProductView> bestSellers() {
    return catalog.bestSellers();
  }

  @GetMapping("/categories")
  public List<CategoryView> categories() {
    return catalog.categories();
  }

  @GetMapping("/categories/{id}/products")
  public PageView<ProductView> categoryProducts(
    @PathVariable Long id,
    @RequestParam(defaultValue = "0") int page
  ) {
    return catalog.list(null, id, null, null, null, null, page, 12, "name,asc", false);
  }

  @PostMapping("/newsletter")
  public Map<String, String> newsletter(@Valid @RequestBody Requests.Newsletter r) {
    people.subscribe(r.email());
    return Map.of("message", "You’re on the list. Thank you for subscribing.");
  }

  @GetMapping("/me")
  public UserView me(@AuthenticationPrincipal Identity id) {
    return people.profile(id.userId());
  }

  @PatchMapping("/me")
  public UserView profile(@AuthenticationPrincipal Identity id, @Valid @RequestBody Requests.Profile r) {
    return people.updateProfile(id.userId(), r);
  }

  @GetMapping("/me/addresses")
  public List<AddressView> addresses(@AuthenticationPrincipal Identity id) {
    return people.addresses(id.userId());
  }

  @PostMapping("/orders")
  @PreAuthorize("hasRole('CUSTOMER')")
  @ResponseStatus(HttpStatus.CREATED)
  public OrderView checkout(@AuthenticationPrincipal Identity id, @Valid @RequestBody Requests.Checkout r) {
    return orders.checkout(id.userId(), r);
  }

  @GetMapping("/orders/my-orders")
  public PageView<OrderView> myOrders(
    @AuthenticationPrincipal Identity id,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
  ) {
    return orders.list(id.userId(), null, null, null, null, null, page, size, "createdAt,desc");
  }

  @GetMapping({ "/orders/{orderId}", "/orders/{orderId}/tracking" })
  public OrderView order(@PathVariable Long orderId, @AuthenticationPrincipal Identity id) {
    return orders.get(orderId, id.userId(), false);
  }

  @PostMapping("/orders/{orderId}/cancel")
  public OrderView cancel(
    @PathVariable Long orderId,
    @AuthenticationPrincipal Identity id,
    @Valid @RequestBody Requests.Cancel r
  ) {
    return orders.cancel(orderId, r.reason(), id.userId(), true);
  }

  @PostMapping("/orders/{orderId}/payment")
  public OrderView retry(
    @PathVariable Long orderId,
    @AuthenticationPrincipal Identity id,
    @Valid @RequestBody Requests.PaymentSimulation r
  ) {
    return orders.retryPayment(orderId, id.userId(), r.simulation());
  }
}
