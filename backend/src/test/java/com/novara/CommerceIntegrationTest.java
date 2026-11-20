package com.novara;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.novara.api.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import com.novara.security.AuthService;
import com.novara.service.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CommerceIntegrationTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper json;

  @Autowired
  AuthService auth;

  @Autowired
  CatalogService catalog;

  @Autowired
  OrderService orders;

  @Autowired
  Users users;

  String admin, manager, staff, customer, other;
  Long customerId, otherId, categoryId;
  String suffix = UUID.randomUUID().toString().substring(0, 8);

  @BeforeAll
  void setup() throws Exception {
    var a = auth.createUser(
      "Test Admin",
      "admin-" + suffix + "@example.test",
      "Integration!2026",
      Role.ADMIN
    );
    auth.createUser("Test Manager", "manager-" + suffix + "@example.test", "Integration!2026", Role.MANAGER);
    auth.createUser("Test Staff", "staff-" + suffix + "@example.test", "Integration!2026", Role.STAFF);
    var c = auth.createUser(
      "Test Customer",
      "customer-" + suffix + "@example.test",
      "Integration!2026",
      Role.CUSTOMER
    );
    customerId = c.id;
    var c2 = auth.createUser(
      "Other Customer",
      "other-" + suffix + "@example.test",
      "Integration!2026",
      Role.CUSTOMER
    );
    otherId = c2.id;
    admin = token("admin");
    manager = token("manager");
    staff = token("staff");
    customer = token("customer");
    other = token("other");
    categoryId = catalog.createCategory(new Requests.CategoryInput("Test " + suffix, "test-" + suffix)).id();
  }

  String token(String name) {
    return auth
      .login(new Requests.Login(name + "-" + suffix + "@example.test", "Integration!2026"))
      .accessToken();
  }

  JsonNode call(
    MockHttpServletRequestBuilder request,
    Object body,
    String token,
    int status
  ) throws Exception {
    if (body != null) request.contentType("application/json").content(json.writeValueAsBytes(body));
    if (token != null) request.header("Authorization", "Bearer " + token);
    var result = mvc.perform(request).andExpect(status().is(status)).andReturn();
    String content = result.getResponse().getContentAsString();
    return content.isBlank() ? json.nullNode() : json.readTree(content);
  }

  Map<String, Object> productBody() {
    return new LinkedHashMap<>(
      Map.of(
        "sku",
        "TEST-" + UUID.randomUUID().toString().substring(0, 10),
        "name",
        "Integration Monitor",
        "description",
        "A monitor for integration testing",
        "price",
        49.95,
        "categoryId",
        categoryId,
        "active",
        true,
        "featured",
        false,
        "specifications",
        "Size: 27 inches",
        "images",
        List.of("/media/catalog/nv-mon-27-0.jpg")
      )
    );
  }

  Long product(int stock) throws Exception {
    Long id = call(post("/api/admin/products"), productBody(), admin, 201).get("id").asLong();
    if (stock > 0) call(
      post("/api/admin/inventory/adjustments"),
      Map.of("productId", id, "delta", stock, "reason", "Test stock"),
      admin,
      200
    );
    return id;
  }

  Map<String, Object> checkout(Long product, int quantity, String method, String outcome) {
    return new LinkedHashMap<>(
      Map.of(
        "items",
        List.of(Map.of("productId", product, "quantity", quantity)),
        "address",
        Map.of(
          "recipient",
          "Test Customer",
          "phone",
          "5550100",
          "line1",
          "10 Test Street",
          "line2",
          "",
          "city",
          "Seattle",
          "region",
          "Washington",
          "postalCode",
          "98101",
          "country",
          "United States"
        ),
        "paymentMethod",
        method,
        "simulation",
        outcome,
        "idempotencyKey",
        UUID.randomUUID().toString()
      )
    );
  }

  int stock(Long id) throws Exception {
    return call(get("/api/products/" + id), null, null, 200)
      .get("stock")
      .asInt();
  }

  JsonNode place(Long p, int q, String method, String outcome) throws Exception {
    return call(post("/api/orders"), checkout(p, q, method, outcome), customer, 201);
  }

  void transition(long id, String status, int code) throws Exception {
    call(
      patch("/api/admin/orders/" + id + "/status"),
      Map.of("status", status, "note", "Integration transition"),
      staff,
      code
    );
  }

  @Test
  void registrationHashesPasswordAndNeverReturnsIt() throws Exception {
    String email = "register-" + UUID.randomUUID() + "@example.test";
    var response = call(
      post("/api/auth/register"),
      Map.of("name", "New Customer", "email", email, "password", "StrongPass!2026"),
      null,
      201
    );
    assertEquals("CUSTOMER", response.at("/user/role").asText());
    assertFalse(response.toString().contains("password"));
    assertTrue(users.findByEmail(email).orElseThrow().passwordHash.startsWith("$2"));
    call(
      post("/api/auth/register"),
      Map.of("name", "Duplicate", "email", email, "password", "StrongPass!2026"),
      null,
      409
    );
    call(
      post("/api/auth/register"),
      Map.of("name", "Invalid", "email", "not-email", "password", "short"),
      null,
      400
    );
  }

  @Test
  void loginRefreshRotationAndLogoutRevocation() throws Exception {
    var login = call(
      post("/api/auth/login"),
      Map.of("email", "customer-" + suffix + "@example.test", "password", "Integration!2026"),
      null,
      200
    );
    call(get("/api/me"), null, login.get("accessToken").asText(), 200);
    var refreshed = call(
      post("/api/auth/refresh"),
      Map.of("refreshToken", login.get("refreshToken").asText()),
      null,
      200
    );
    call(post("/api/auth/refresh"), Map.of("refreshToken", login.get("refreshToken").asText()), null, 401);
    call(get("/api/me"), null, login.get("accessToken").asText(), 401);
    call(post("/api/auth/logout"), Map.of("refreshToken", refreshed.get("refreshToken").asText()), null, 200);
    call(get("/api/me"), null, refreshed.get("accessToken").asText(), 401);
    call(
      post("/api/auth/login"),
      Map.of("email", "customer-" + suffix + "@example.test", "password", "incorrect"),
      null,
      401
    );
    call(get("/api/me"), null, "invalid.jwt.value", 401);
  }

  @Test
  void productRetrievalCreationValidationAndDuplicateSku() throws Exception {
    var body = productBody();
    var created = call(post("/api/admin/products"), body, manager, 201);
    call(get("/api/products/" + created.get("id").asLong()), null, null, 200);
    call(post("/api/admin/products"), body, admin, 409);
    body.put("sku", "BAD-" + suffix);
    body.put("price", -1);
    call(post("/api/admin/products"), body, admin, 400);
    call(
      get("/api/products").param("minPrice", "10").param("maxPrice", "100").param("sort", "price,asc"),
      null,
      null,
      200
    );
    call(get("/api/products").param("sort", "passwordHash,desc"), null, null, 400);
    call(get("/api/products").param("size", "1000"), null, null, 400);
  }

  @Test
  void orderUsesServerPricesAndCreatesPaymentAndMovement() throws Exception {
    Long p = product(10);
    var o = place(p, 2, "CARD", "SUCCESS");
    assertEquals(new BigDecimal("109.85"), o.get("total").decimalValue());
    assertEquals("PAID", o.at("/payment/status").asText());
    assertEquals(8, stock(p));
    var movement = call(
      get("/api/admin/inventory/movements").param("productId", p.toString()),
      null,
      admin,
      200
    );
    assertEquals(-2, movement.at("/content/0/delta").asInt());
    assertEquals(8, movement.at("/content/0/balanceAfter").asInt());
    var tampered = checkout(p, 1, "CARD", "SUCCESS");
    tampered.put("total", 0.01);
    call(post("/api/orders"), tampered, customer, 400);
  }

  @Test
  void freeShippingIsCalculatedOnServer() throws Exception {
    var o = place(product(5), 3, "CARD", "SUCCESS");
    assertEquals(0, o.get("shipping").decimalValue().compareTo(BigDecimal.ZERO));
    assertEquals(new BigDecimal("149.85"), o.get("total").decimalValue());
  }

  @Test
  void insufficientStockRollsBackWholeOrder() throws Exception {
    Long first = product(3),
      second = product(1);
    var body = checkout(first, 2, "CARD", "SUCCESS");
    body.put(
      "items",
      List.of(Map.of("productId", first, "quantity", 2), Map.of("productId", second, "quantity", 2))
    );
    call(post("/api/orders"), body, customer, 409);
    assertEquals(3, stock(first));
    assertEquals(1, stock(second));
  }

  @Test
  void idempotencyPreventsDoubleCheckout() throws Exception {
    Long p = product(6);
    var body = checkout(p, 2, "CARD", "SUCCESS");
    var a = call(post("/api/orders"), body, customer, 201);
    var b = call(post("/api/orders"), body, customer, 201);
    assertEquals(a.get("id"), b.get("id"));
    assertEquals(4, stock(p));
    body.put("items", List.of(Map.of("productId", p, "quantity", 1)));
    call(post("/api/orders"), body, customer, 409);
  }

  @Test
  void failedPaymentReservesNothingAndSuccessfulRetryAllocates() throws Exception {
    Long p = product(5);
    var o = place(p, 2, "CARD", "DECLINE");
    long id = o.get("id").asLong();
    assertEquals("FAILED", o.at("/payment/status").asText());
    assertEquals(5, stock(p));
    transition(id, "CONFIRMED", 409);
    var paid = call(post("/api/orders/" + id + "/payment"), Map.of("simulation", "SUCCESS"), customer, 200);
    assertEquals("PAID", paid.at("/payment/status").asText());
    assertEquals(3, stock(p));
    call(post("/api/orders/" + id + "/payment"), Map.of("simulation", "SUCCESS"), customer, 409);
  }

  @Test
  void cancellationRestoresStockExactlyOnceAndRefunds() throws Exception {
    Long p = product(10);
    long id = place(p, 3, "CARD", "SUCCESS").get("id").asLong();
    assertEquals(7, stock(p));
    var cancelled = call(
      post("/api/admin/orders/" + id + "/cancel"),
      Map.of("reason", "Changed mind"),
      manager,
      200
    );
    assertEquals("CANCELLED", cancelled.get("status").asText());
    assertEquals("REFUNDED", cancelled.at("/payment/status").asText());
    assertEquals(10, stock(p));
    call(post("/api/admin/orders/" + id + "/cancel"), Map.of("reason", "Repeat request"), manager, 200);
    assertEquals(10, stock(p));
    transition(id, "CONFIRMED", 409);
    transition(id, "SHIPPED", 409);
  }

  @Test
  void fulfillmentRequiresSequentialStatesAndShipmentAndCodPaidOnDelivery() throws Exception {
    long id = place(product(8), 1, "COD", "SUCCESS").get("id").asLong();
    transition(id, "SHIPPED", 409);
    transition(id, "CONFIRMED", 200);
    transition(id, "PROCESSING", 200);
    transition(id, "SHIPPED", 409);
    var shipment = call(
      post("/api/admin/shipments"),
      Map.of(
        "orderId",
        id,
        "carrier",
        "Test Express",
        "estimatedDelivery",
        LocalDate.now().plusDays(3).toString()
      ),
      staff,
      201
    );
    call(
      post("/api/admin/shipments"),
      Map.of(
        "orderId",
        id,
        "carrier",
        "Duplicate",
        "estimatedDelivery",
        LocalDate.now().plusDays(3).toString()
      ),
      staff,
      409
    );
    call(
      patch("/api/admin/shipments/" + shipment.get("id").asLong() + "/status"),
      Map.of("status", "IN_TRANSIT"),
      staff,
      200
    );
    var tracked = call(get("/api/orders/" + id + "/tracking"), null, customer, 200);
    assertEquals("SHIPPED", tracked.get("status").asText());
    assertEquals("PENDING", tracked.at("/payment/status").asText());
    call(post("/api/admin/orders/" + id + "/cancel"), Map.of("reason", "Too late"), admin, 409);
    transition(id, "DELIVERED", 200);
    tracked = call(get("/api/orders/" + id), null, customer, 200);
    assertEquals("PAID", tracked.at("/payment/status").asText());
    assertEquals("DELIVERED", tracked.at("/shipment/status").asText());
    transition(id, "PROCESSING", 409);
  }

  @Test
  void customerCannotAccessOtherOrders() throws Exception {
    long id = place(product(2), 1, "CARD", "SUCCESS").get("id").asLong();
    call(get("/api/orders/" + id), null, other, 404);
    call(get("/api/orders/" + id + "/tracking"), null, other, 404);
    call(post("/api/orders/" + id + "/cancel"), Map.of("reason", "Not mine"), other, 404);
    call(post("/api/orders/" + id + "/payment"), Map.of("simulation", "SUCCESS"), other, 404);
  }

  @Test
  void backendEnforcesRolePermissions() throws Exception {
    call(get("/api/admin/orders"), null, null, 401);
    call(get("/api/admin/orders"), null, customer, 403);
    call(get("/api/admin/orders"), null, staff, 200);
    call(post("/api/admin/products"), productBody(), staff, 403);
    call(get("/api/admin/customers"), null, staff, 403);
    call(get("/api/admin/analytics/overview"), null, staff, 403);
    call(get("/api/admin/payments"), null, staff, 403);
    call(get("/api/admin/users"), null, manager, 403);
    call(get("/api/admin/users"), null, admin, 200);
    call(post("/api/orders"), checkout(product(2), 1, "CARD", "SUCCESS"), admin, 403);
  }

  @Test
  void negativeInventoryAndZeroAdjustmentRejected() throws Exception {
    Long p = product(2);
    call(
      post("/api/admin/inventory/adjustments"),
      Map.of("productId", p, "delta", -3, "reason", "Count"),
      admin,
      409
    );
    assertEquals(2, stock(p));
    call(
      post("/api/admin/inventory/adjustments"),
      Map.of("productId", p, "delta", 0, "reason", "Count"),
      admin,
      400
    );
  }

  @Test
  void deactivatedProductCannotBePurchasedButHistorySurvives() throws Exception {
    Long p = product(3);
    long id = place(p, 1, "CARD", "SUCCESS").get("id").asLong();
    call(delete("/api/admin/products/" + p), null, admin, 204);
    call(get("/api/products/" + p), null, null, 404);
    call(post("/api/orders"), checkout(p, 1, "CARD", "SUCCESS"), customer, 409);
    call(get("/api/orders/" + id), null, customer, 200);
  }

  @Test
  void simultaneousCustomersCannotOversell() throws Exception {
    Long p = product(1);
    var ready = new CountDownLatch(2);
    var start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      List<Future<Boolean>> futures = new ArrayList<>();
      for (Long uid : List.of(customerId, otherId))
        futures.add(
          pool.submit(() -> {
            ready.countDown();
            start.await();
            try {
              orders.checkout(
                uid,
                json.convertValue(checkout(p, 1, "CARD", "SUCCESS"), Requests.Checkout.class)
              );
              return true;
            } catch (ApiException e) {
              assertEquals(409, e.status.value());
              return false;
            }
          })
        );
      assertTrue(ready.await(5, TimeUnit.SECONDS));
      start.countDown();
      int successes = 0;
      for (var f : futures) if (f.get(15, TimeUnit.SECONDS)) successes++;
      assertEquals(1, successes);
    }
    assertEquals(0, stock(p));
  }

  @Test
  void analyticsAndFilteringReturnDatabaseValues() throws Exception {
    place(product(5), 1, "CARD", "SUCCESS");
    var analytics = call(get("/api/admin/analytics/overview").param("days", "7"), null, manager, 200);
    assertEquals(7, analytics.get("series").size());
    assertTrue(analytics.get("totalOrders").asLong() > 0);
    assertTrue(analytics.get("revenue").decimalValue().compareTo(BigDecimal.ZERO) > 0);
    var data = call(
      get("/api/admin/orders")
        .param("q", "Test Customer")
        .param("paymentStatus", "PAID")
        .param("sort", "total,asc"),
      null,
      staff,
      200
    );
    for (JsonNode o : data.get("content")) assertEquals("PAID", o.at("/payment/status").asText());
  }
}
