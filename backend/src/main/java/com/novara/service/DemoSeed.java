package com.novara.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novara.api.Requests;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import com.novara.security.AuthService;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoSeed implements ApplicationRunner {

  private final Users users;
  private final Categories categories;
  private final Orders orders;
  private final Payments payments;
  private final Histories histories;
  private final PaymentEvents events;
  private final Movements movements;
  private final CatalogService catalog;
  private final OrderService orderService;
  private final AuthService auth;
  private final ObjectMapper json;
  private final boolean enabled;
  private final String password;

  public DemoSeed(
    Users u,
    Categories c,
    Orders o,
    Payments p,
    Histories h,
    PaymentEvents e,
    Movements m,
    CatalogService cat,
    OrderService os,
    AuthService a,
    ObjectMapper j,
    @Value("${app.seed}") boolean enabled,
    @Value("${app.demo-password}") String password
  ) {
    users = u;
    categories = c;
    orders = o;
    payments = p;
    histories = h;
    events = e;
    movements = m;
    catalog = cat;
    orderService = os;
    auth = a;
    json = j;
    this.enabled = enabled;
    this.password = password;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) throws Exception {
    if (!enabled || users.count() > 0) return;
    if (password.length() < 10) throw new IllegalStateException(
      "Set DEMO_PASSWORD before enabling development seed data"
    );
    User admin = auth.createUser("Alex Morgan", "admin@novara.demo", password, Role.ADMIN);
    auth.createUser("Jordan Lee", "manager@novara.demo", password, Role.MANAGER);
    auth.createUser("Sam Rivera", "staff@novara.demo", password, Role.STAFF);
    List<User> customers = new ArrayList<>();
    String[] names = {
      "Jamie Chen",
      "Olivia Bennett",
      "Noah Williams",
      "Amelia Park",
      "Ethan Brooks",
      "Sofia Martinez",
      "Lucas Taylor",
      "Mia Thompson",
    };
    for (int i = 0; i < names.length; i++) customers.add(
      auth.createUser(
        names[i],
        i == 0
          ? "customer@novara.demo"
          : names[i].toLowerCase(Locale.ROOT).replace(" ", ".") + "@example.test",
        password,
        Role.CUSTOMER
      )
    );
    Map<String, Long> cats = new LinkedHashMap<>();
    for (String name : List.of("Monitors", "Laptops", "Keyboards", "Audio", "Mice", "Accessories")) {
      Category c = new Category();
      c.name = name;
      c.slug = name.toLowerCase(Locale.ROOT);
      cats.put(name, categories.save(c).id);
    }
    List<Long> ids = new ArrayList<>();
    for (JsonNode p : json.readTree(new ClassPathResource("catalog-seed.json").getInputStream())) {
      List<String> images = new ArrayList<>();
      p.get("images").forEach(x -> images.add(x.asText()));
      var product = catalog.save(
        null,
        new Requests.ProductInput(
          p.get("sku").asText(),
          p.get("name").asText(),
          p.get("description").asText(),
          p.get("price").decimalValue(),
          p.get("compareAtPrice").isNull() ? null : p.get("compareAtPrice").decimalValue(),
          cats.get(p.get("category").asText()),
          true,
          p.get("featured").asBoolean(),
          p.get("specifications").asText(),
          images
        )
      );
      ids.add(product.id());
      catalog.adjust(
        new Requests.Adjustment(product.id(), p.get("stock").asInt() + 20, "Opening warehouse stock"),
        admin.id
      );
    }
    for (int i = 0; i < 30; i++) {
      User customer = customers.get(i % customers.size());
      var address = new Requests.AddressInput(
        customer.name,
        "+1 415 555 01" + String.format("%02d", i),
        120 + i + " Market Street",
        "Apt " + (i + 1),
        "San Francisco",
        "California",
        "94103",
        "United States"
      );
      var view = orderService.checkout(
        customer.id,
        new Requests.Checkout(
          List.of(
            new Requests.Item(ids.get(i % ids.size()), 1 + (i % 3 == 0 ? 1 : 0)),
            new Requests.Item(ids.get(9), 1)
          ),
          address,
          i % 5 == 0 ? PaymentMethod.COD : PaymentMethod.CARD,
          i == 28 ? Requests.Simulation.DECLINE : Requests.Simulation.SUCCESS,
          "seed-order-" + i
        )
      );
      if (i < 22) {
        orderService.transition(
          view.id(),
          new Requests.Transition(OrderStatus.CONFIRMED, "Payment and availability checked"),
          admin.id
        );
      }
      if (i < 18) {
        orderService.transition(
          view.id(),
          new Requests.Transition(OrderStatus.PROCESSING, "Picked for packing"),
          admin.id
        );
      }
      if (i < 15) {
        orderService.createShipment(
          new Requests.ShipmentInput(view.id(), "NOVARA Express", LocalDate.now(ZoneOffset.UTC).plusDays(3)),
          admin.id
        );
        orderService.transition(
          view.id(),
          new Requests.Transition(OrderStatus.SHIPPED, "Handed to carrier"),
          admin.id
        );
      }
      if (i < 12) {
        orderService.transition(
          view.id(),
          new Requests.Transition(OrderStatus.DELIVERED, "Delivered to recipient"),
          admin.id
        );
      }
      if (i == 22) orderService.cancel(view.id(), "Customer changed their selection", admin.id, false);
      Order o = orders.findById(view.id()).orElseThrow();
      Instant time = Instant.now().minusSeconds((29L - i) * 86400 + 3600);
      o.createdAt = time;
      o.payment.createdAt = time;
      int n = 0;
      for (History h : histories.findByOrderIdOrderByCreatedAtAsc(o.id))
        h.createdAt = time.plusSeconds(n++ * 600L);
      for (PaymentEvent e : events.findByPaymentIdOrderByCreatedAtAsc(o.payment.id)) e.createdAt = time;
    }
    // Demonstrate actionable low stock while preserving the complete movement audit.
    for (int index : List.of(2, 7, 10)) {
      var p = catalog.get(ids.get(index), true);
      catalog.adjust(
        new Requests.Adjustment(
          p.id(),
          (index == 2 ? 5 : index == 7 ? 3 : 8) - p.stock(),
          "Opening stock reconciliation"
        ),
        admin.id
      );
    }
  }
}
