package com.novara;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@SpringBootApplication(
  exclude = org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
)
@EnableMethodSecurity
@EnableJpaRepositories(considerNestedRepositories = true)
public class NovaraApplication {

  public static void main(String[] args) {
    SpringApplication.run(NovaraApplication.class, args);
  }
}
