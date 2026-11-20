package com.novara;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.novara.api.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import com.novara.service.CatalogService;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CatalogServiceTest {

  @Test
  void insufficientStockDoesNotWriteMovement() {
    Inventories inventory = mock(Inventories.class);
    Movements movements = mock(Movements.class);
    Product product = new Product();
    product.id = 1L;
    product.name = "Monitor";
    Inventory state = new Inventory();
    state.quantity = 2;
    when(inventory.lockByProductId(1L)).thenReturn(Optional.of(state));
    CatalogService service = new CatalogService(
      mock(Products.class),
      mock(Categories.class),
      inventory,
      movements,
      mock(Users.class),
      mock(Views.class)
    );
    assertThrows(ApiException.class, () -> service.move(product, -3, "Order", new User(), 1L));
    assertEquals(2, state.quantity);
    verifyNoInteractions(movements);
    verify(inventory, never()).save(any());
  }

  @Test
  void stockAdjustmentRecordsBalanceAndActor() {
    Inventories inventory = mock(Inventories.class);
    Movements movements = mock(Movements.class);
    Product product = new Product();
    product.id = 1L;
    Inventory state = new Inventory();
    state.quantity = 2;
    User actor = new User();
    actor.id = 9L;
    when(inventory.lockByProductId(1L)).thenReturn(Optional.of(state));
    CatalogService service = new CatalogService(
      mock(Products.class),
      mock(Categories.class),
      inventory,
      movements,
      mock(Users.class),
      mock(Views.class)
    );
    service.move(product, 5, "Delivery", actor, null);
    verify(movements).save(
      argThat(m -> m.delta == 5 && m.balanceAfter == 7 && m.actor == actor && m.reason.equals("Delivery"))
    );
  }
}
