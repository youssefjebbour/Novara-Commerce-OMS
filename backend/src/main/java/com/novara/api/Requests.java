package com.novara.api;

import com.novara.domain.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class Requests {

  private Requests() {}

  public record Register(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 10, max = 72) String password
  ) {}

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}

  public record Refresh(@NotBlank @Size(max = 200) String refreshToken) {}

  public record Profile(@NotBlank @Size(max = 100) String name, @Size(max = 30) String phone) {}

  public record AddressInput(
    @NotBlank @Size(max = 100) String recipient,
    @NotBlank @Size(max = 30) String phone,
    @NotBlank @Size(max = 255) String line1,
    @Size(max = 100) String line2,
    @NotBlank @Size(max = 100) String city,
    @NotBlank @Size(max = 100) String region,
    @NotBlank @Size(max = 20) String postalCode,
    @NotBlank @Size(max = 80) String country
  ) {}

  public record Item(@NotNull @Positive Long productId, @Min(1) @Max(99) int quantity) {}

  public record Checkout(
    @NotEmpty @Size(max = 50) List<@Valid Item> items,
    @NotNull @Valid AddressInput address,
    @NotNull PaymentMethod paymentMethod,
    @NotNull Simulation simulation,
    @NotBlank @Size(max = 80) String idempotencyKey
  ) {}

  public enum Simulation {
    SUCCESS,
    DECLINE,
  }

  public record ProductInput(
    @NotBlank @Size(max = 80) @Pattern(regexp = "[A-Za-z0-9_-]+") String sku,
    @NotBlank @Size(max = 160) String name,
    @NotBlank @Size(max = 5000) String description,
    @NotNull @DecimalMin("0.01") @DecimalMax("999999.99") @Digits(integer = 6, fraction = 2) BigDecimal price,
    @DecimalMin("0.01") @DecimalMax("999999.99") @Digits(integer = 6, fraction = 2) BigDecimal compareAtPrice,
    @NotNull @Positive Long categoryId,
    boolean active,
    boolean featured,
    @NotBlank @Size(max = 2000) String specifications,
    @NotEmpty @Size(max = 8) List<@NotBlank @Size(max = 500) String> images
  ) {}

  public record CategoryInput(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Pattern(regexp = "[a-z0-9-]{1,80}") String slug
  ) {}

  public record Adjustment(
    @NotNull @Positive Long productId,
    @Min(-100000) @Max(100000) int delta,
    @NotBlank @Size(max = 255) String reason
  ) {}

  public record Transition(@NotNull OrderStatus status, @NotBlank @Size(max = 255) String note) {}

  public record Cancel(@NotBlank @Size(max = 255) String reason) {}

  public record ShipmentInput(
    @NotNull @Positive Long orderId,
    @NotBlank @Size(max = 80) String carrier,
    @NotNull @FutureOrPresent LocalDate estimatedDelivery
  ) {}

  public record ShipmentUpdate(@NotNull ShipmentStatus status) {}

  public record UserInput(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 10, max = 72) String password,
    @NotNull Role role
  ) {}

  public record UserUpdate(@NotNull Role role, boolean active) {}

  public record Newsletter(@NotBlank @Email @Size(max = 254) String email) {}

  public record PaymentSimulation(@NotNull Simulation simulation) {}
}
