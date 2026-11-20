package com.novara.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  public SecurityFilterChain security(
    HttpSecurity http,
    AuthService auth,
    ObjectMapper json,
    @Value("${app.cors-origins}") String origins
  ) throws Exception {
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(Arrays.asList(origins.split(",")));
    cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cors);
    return http
      .csrf(c -> c.disable())
      .cors(c -> c.configurationSource(source))
      .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(HttpMethod.OPTIONS, "/**")
          .permitAll()
          .requestMatchers(
            "/api/auth/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/actuator/health",
            "/media/**"
          )
          .permitAll()
          .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**")
          .permitAll()
          .requestMatchers(HttpMethod.POST, "/api/newsletter")
          .permitAll()
          .requestMatchers("/api/admin/**")
          .hasAnyRole("ADMIN", "MANAGER", "STAFF")
          .anyRequest()
          .authenticated()
      )
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((req, res, ex) -> {
            res.setStatus(401);
            res.setContentType("application/json");
            json.writeValue(
              res.getOutputStream(),
              Map.of("message", "Please sign in to continue", "status", 401)
            );
          })
          .accessDeniedHandler((req, res, ex) -> {
            res.setStatus(403);
            res.setContentType("application/json");
            json.writeValue(
              res.getOutputStream(),
              Map.of("message", "This action is not permitted for your role", "status", 403)
            );
          })
      )
      .addFilterBefore(
        new OncePerRequestFilter() {
          @Override
          protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException
          {
            String header = req.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
              try {
                var id = auth.verify(header.substring(7));
                var authentication = new UsernamePasswordAuthenticationToken(
                  id,
                  null,
                  List.of(new SimpleGrantedAuthority("ROLE_" + id.role()))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
              } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
              }
            }
            chain.doFilter(req, res);
          }
        },
        UsernamePasswordAuthenticationFilter.class
      )
      .build();
  }
}
