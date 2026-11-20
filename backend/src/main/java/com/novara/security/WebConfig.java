package com.novara.security;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final String uploads;

  public WebConfig(@Value("${app.upload-dir}") String uploads) {
    this.uploads = uploads;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry r) {
    r.addResourceHandler("/media/uploads/**").addResourceLocations(
      Path.of(uploads).toAbsolutePath().toUri().toString() + "/"
    );
  }
}
