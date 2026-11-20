package com.novara;

import static org.junit.jupiter.api.Assertions.*;

import com.novara.domain.Model.OrderStatus;
import com.novara.service.OrderService;
import org.junit.jupiter.api.Test;

class OrderRulesTest {

  @Test
  void onlyForwardFulfillmentStepsAreAllowed() {
    for (OrderStatus from : OrderStatus.values())
      for (OrderStatus to : OrderStatus.values()) {
        boolean expected =
          (from == OrderStatus.PENDING && to == OrderStatus.CONFIRMED) ||
          (from == OrderStatus.CONFIRMED && to == OrderStatus.PROCESSING) ||
          (from == OrderStatus.PROCESSING && to == OrderStatus.SHIPPED) ||
          (from == OrderStatus.SHIPPED && to == OrderStatus.DELIVERED);
        assertEquals(expected, OrderService.canTransition(from, to), from + " -> " + to);
      }
  }
}
