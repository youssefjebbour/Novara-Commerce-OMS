package com.novara.service;

import com.novara.api.*;
import com.novara.api.Views.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import com.novara.security.AuthService;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PeopleService {

  private final Users users;
  private final Addresses addresses;
  private final Subscriptions subscriptions;
  private final AuthService auth;
  private final OrderService orders;

  public PeopleService(Users u, Addresses a, Subscriptions s, AuthService auth, OrderService o) {
    users = u;
    addresses = a;
    subscriptions = s;
    this.auth = auth;
    orders = o;
  }

  public UserView profile(Long id) {
    return Views.user(users.findById(id).orElseThrow(ApiException::unauthorized));
  }

  @Transactional
  public UserView updateProfile(Long id, Requests.Profile r) {
    var u = users.findById(id).orElseThrow();
    u.name = r.name().trim();
    u.phone = r.phone();
    return Views.user(u);
  }

  public List<AddressView> addresses(Long id) {
    return addresses
      .findByUserIdOrderByCreatedAtDesc(id)
      .stream()
      .map(Views::address)
      .distinct()
      .limit(20)
      .toList();
  }

  public PageView<UserView> list(String q, Role role, int page, int size) {
    return PageView.of(
      users
        .findAll(
          (root, query, cb) -> {
            var ps = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (role != null) ps.add(cb.equal(root.get("role"), role));
            if (q != null && !q.isBlank()) ps.add(
              cb.or(
                cb.like(cb.lower(root.get("name")), CatalogService.like(q), '\\'),
                cb.like(cb.lower(root.get("email")), CatalogService.like(q), '\\')
              )
            );
            return cb.and(ps.toArray(jakarta.persistence.criteria.Predicate[]::new));
          },
          CatalogService.page(page, size, "createdAt,desc", Set.of("createdAt"))
        )
        .map(Views::user)
    );
  }

  public Map<String, Object> customer(Long id) {
    var u = users.findById(id).orElseThrow(() -> ApiException.missing("Customer"));
    if (u.role != Role.CUSTOMER) throw ApiException.missing("Customer");
    return Map.of(
      "customer",
      Views.user(u),
      "addresses",
      addresses(id),
      "orders",
      orders.list(id, null, null, null, null, null, 0, 100, "createdAt,desc")
    );
  }

  @Transactional
  public UserView create(Requests.UserInput r) {
    return Views.user(auth.createUser(r.name(), r.email(), r.password(), r.role()));
  }

  @Transactional
  public UserView update(Long id, Requests.UserUpdate r, Long actor) {
    if (id.equals(actor)) throw ApiException.bad(
      "You cannot change your own role or deactivate your own account"
    );
    User u = users.lock(id).orElseThrow(() -> ApiException.missing("User"));
    if (u.role == Role.CUSTOMER || r.role() == Role.CUSTOMER) throw ApiException.bad(
      "Customer and internal staff accounts must remain separate"
    );
    u.role = r.role();
    u.active = r.active();
    return Views.user(u);
  }

  @Transactional
  public void subscribe(String email) {
    email = email.trim().toLowerCase(Locale.ROOT);
    if (!subscriptions.existsByEmail(email)) {
      Subscription s = new Subscription();
      s.email = email;
      subscriptions.save(s);
    }
  }
}
