package com.novara.api;

import com.novara.service.ImageService;
import java.io.IOException;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ImageController {

  private final ImageService images;

  public ImageController(ImageService i) {
    images = i;
  }

  @PostMapping(value = "/api/admin/uploads", consumes = "multipart/form-data")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public Map<String, String> upload(@RequestPart("file") MultipartFile file) throws IOException {
    return Map.of("url", images.upload(file));
  }
}
