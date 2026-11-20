package com.novara.service;

import com.novara.api.ApiException;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageService {

  private final Path directory;

  public ImageService(@Value("${app.upload-dir}") String path) throws IOException {
    directory = Path.of(path).toAbsolutePath().normalize();
    Files.createDirectories(directory);
  }

  public String upload(MultipartFile file) throws IOException {
    if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw ApiException.bad(
      "Select a PNG or JPEG smaller than 5 MB"
    );
    try (ImageInputStream stream = ImageIO.createImageInputStream(file.getInputStream())) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw ApiException.bad("This file is not a supported image");
      ImageReader reader = readers.next();
      try {
        reader.setInput(stream);
        if (
          !Set.of("PNG", "JPEG", "JPG").contains(reader.getFormatName().toUpperCase(Locale.ROOT))
        ) throw ApiException.bad("Only PNG and JPEG images are supported");
        if (
          reader.getWidth(0) > 6000 ||
          reader.getHeight(0) > 6000 ||
          (long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000
        ) throw ApiException.bad("Image dimensions are too large");
        var image = reader.read(0);
        String name = UUID.randomUUID() + ".png";
        ImageIO.write(image, "png", directory.resolve(name).toFile());
        return "/media/uploads/" + name;
      } finally {
        reader.dispose();
      }
    }
  }
}
