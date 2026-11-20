package com.novara.security;

import com.novara.api.*;
import com.novara.domain.Model.*;
import com.novara.domain.Repositories.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final Users users;
  private final Sessions sessions;
  private final PasswordEncoder encoder;
  private final SecretKey key;

  public AuthService(Users u, Sessions s, PasswordEncoder p, @Value("${app.jwt-secret}") String secret) {
    users = u;
    sessions = s;
    encoder = p;
    if (secret.length() < 64) throw new IllegalArgumentException(
      "JWT_SECRET must contain at least 64 characters"
    );
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public record Tokens(String accessToken, String refreshToken, Views.UserView user) {}

  public record Identity(Long userId, Long sessionId, Role role) {}

  public static String hash(String value) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
      );
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional
  public Tokens register(Requests.Register request) {
    var user = createUser(request.name(), request.email(), request.password(), Role.CUSTOMER);
    return issue(user);
  }

  @Transactional
  public User createUser(String name, String email, String password, Role role) {
    email = email.trim().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent()) throw ApiException.conflict(
      "An account with this email already exists"
    );
    if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw ApiException.bad(
      "Password must fit within 72 UTF-8 bytes"
    );
    User user = new User();
    user.name = name.trim();
    user.email = email;
    user.passwordHash = encoder.encode(password);
    user.role = role;
    return users.save(user);
  }

  @Transactional
  public Tokens login(Requests.Login request) {
    var u = users.findByEmail(request.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
    // Always perform BCrypt, including for an unknown account, to reduce timing disclosure.
    String fallback = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    boolean matches = encoder.matches(request.password(), u == null ? fallback : u.passwordHash);
    if (u == null || !matches || !u.active) throw new ApiException(
      org.springframework.http.HttpStatus.UNAUTHORIZED,
      "Email or password is incorrect"
    );
    return issue(u);
  }

  private Tokens issue(User user) {
    String refresh = UUID.randomUUID().toString() + UUID.randomUUID();
    Session session = new Session();
    session.user = user;
    session.refreshHash = hash(refresh);
    session.expiresAt = Instant.now().plusSeconds(604800);
    sessions.save(session);
    String jwt = Jwts.builder()
      .subject(user.id.toString())
      .id(session.id.toString())
      .issuer("novara")
      .issuedAt(new Date())
      .expiration(Date.from(Instant.now().plusSeconds(900)))
      .signWith(key)
      .compact();
    return new Tokens(jwt, refresh, Views.user(user));
  }

  @Transactional
  public Tokens refresh(String token) {
    var s = sessions.findByRefreshHash(hash(token)).orElseThrow(ApiException::unauthorized);
    if (s.revoked || s.expiresAt.isBefore(Instant.now()) || !s.user.active) throw ApiException.unauthorized();
    s.revoked = true;
    return issue(s.user);
  }

  @Transactional
  public void logout(String token) {
    sessions.findByRefreshHash(hash(token)).ifPresent(s -> s.revoked = true);
  }

  @Transactional(readOnly = true)
  public Identity verify(String token) {
    var claims = Jwts.parser()
      .verifyWith(key)
      .requireIssuer("novara")
      .build()
      .parseSignedClaims(token)
      .getPayload();
    var s = sessions.findById(Long.valueOf(claims.getId())).orElseThrow(ApiException::unauthorized);
    if (
      s.revoked ||
      s.expiresAt.isBefore(Instant.now()) ||
      !s.user.active ||
      !s.user.id.toString().equals(claims.getSubject())
    ) throw ApiException.unauthorized();
    return new Identity(s.user.id, s.id, s.user.role);
  }
}
