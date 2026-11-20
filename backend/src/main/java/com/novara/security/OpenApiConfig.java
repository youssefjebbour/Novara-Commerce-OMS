package com.novara.security;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.*;

@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI openAPI() {
    return new OpenAPI()
      .info(
        new Info()
          .title("NOVARA commerce & OMS API")
          .version("1.0")
          .description(
            "Prices in USD. Simulated payments only. Sign in and paste the accessToken into Authorize."
          )
      )
      .components(
        new Components().addSecuritySchemes(
          "bearer",
          new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
        )
      )
      .addSecurityItem(new SecurityRequirement().addList("bearer"));
  }
}
