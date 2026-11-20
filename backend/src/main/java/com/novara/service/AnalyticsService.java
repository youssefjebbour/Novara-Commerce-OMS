package com.novara.service;

import com.novara.api.ApiException;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

  private final JdbcTemplate db;

  public AnalyticsService(JdbcTemplate db) {
    this.db = db;
  }

  public Map<String, Object> overview(int days) {
    if (days < 1 || days > 365) throw ApiException.bad("Days must be between 1 and 365");
    LocalDate start = LocalDate.now(ZoneOffset.UTC).minusDays(days - 1);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("days", days);
    result.put("from", start);
    result.put("to", LocalDate.now(ZoneOffset.UTC));
    result.put(
      "revenue",
      db.queryForObject(
        "SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.status='PAID' AND o.created_at>=?",
        BigDecimal.class,
        Date.valueOf(start)
      )
    );
    result.put(
      "totalOrders",
      db.queryForObject("SELECT COUNT(*) FROM orders WHERE created_at>=?", Long.class, Date.valueOf(start))
    );
    result.put(
      "pendingOrders",
      db.queryForObject("SELECT COUNT(*) FROM orders WHERE status='PENDING'", Long.class)
    );
    result.put(
      "completedOrders",
      db.queryForObject(
        "SELECT COUNT(*) FROM orders WHERE status='DELIVERED' AND created_at>=?",
        Long.class,
        Date.valueOf(start)
      )
    );
    result.put(
      "totalCustomers",
      db.queryForObject("SELECT COUNT(*) FROM users WHERE role='CUSTOMER'", Long.class)
    );
    result.put(
      "lowStock",
      db.queryForObject(
        "SELECT COUNT(*) FROM inventory i JOIN products p ON p.id=i.product_id WHERE i.quantity<=i.low_stock_threshold AND p.active=1",
        Long.class
      )
    );
    var raw = db.queryForList(
      "SELECT DATE(o.created_at) day, COUNT(*) orders, SUM(CASE WHEN p.status='PAID' THEN o.total ELSE 0 END) revenue FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.created_at>=? GROUP BY DATE(o.created_at)",
      Date.valueOf(start)
    );
    Map<String, Map<String, Object>> byDate = new HashMap<>();
    for (var r : raw) byDate.put(r.get("day").toString(), r);
    List<Map<String, Object>> series = new ArrayList<>();
    for (int i = 0; i < days; i++) {
      String day = start.plusDays(i).toString();
      var r = byDate.get(day);
      series.add(
        Map.of(
          "day",
          day,
          "orders",
          r == null ? 0 : r.get("orders"),
          "revenue",
          r == null ? BigDecimal.ZERO : r.get("revenue")
        )
      );
    }
    result.put("series", series);
    result.put(
      "statuses",
      db.queryForList(
        "SELECT status,COUNT(*) count FROM orders WHERE created_at>=? GROUP BY status ORDER BY count DESC",
        Date.valueOf(start)
      )
    );
    result.put(
      "bestSellers",
      db.queryForList(
        "SELECT p.id,p.name,p.sku,(SELECT pi.url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.position LIMIT 1) image, SUM(i.quantity) units,SUM(i.quantity*i.unit_price) revenue FROM order_items i JOIN orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id JOIN payments pay ON pay.order_id=o.id WHERE o.status<>'CANCELLED' AND pay.status<>'FAILED' AND o.created_at>=? GROUP BY p.id,p.name,p.sku ORDER BY units DESC,p.id LIMIT 5",
        Date.valueOf(start)
      )
    );
    return result;
  }
}
