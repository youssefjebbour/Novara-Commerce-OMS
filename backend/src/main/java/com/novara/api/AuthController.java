package com.novara.api;

import com.novara.security.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthService.Tokens register(@Valid @RequestBody Requests.Register r) {
    return auth.register(r);
  }

  @PostMapping("/login")
  public AuthService.Tokens login(@Valid @RequestBody Requests.Login r) {
    return auth.login(r);
  }

  @PostMapping("/refresh")
  public AuthService.Tokens refresh(@Valid @RequestBody Requests.Refresh r) {
    return auth.refresh(r.refreshToken());
  }

  @PostMapping("/logout")
  public Map<String, String> logout(@Valid @RequestBody Requests.Refresh r) {
    auth.logout(r.refreshToken());
    return Map.of("message", "Signed out");
  }
}
