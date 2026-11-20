package com.novara.api;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ErrorHandler {

  private static final Logger log = LoggerFactory.getLogger(ErrorHandler.class);

  public record ErrorBody(
    String message,
    int status,
    String path,
    Instant timestamp,
    Map<String, String> fields
  ) {}

  private ResponseEntity<ErrorBody> reply(
    HttpStatus status,
    String message,
    HttpServletRequest request,
    Map<String, String> fields
  ) {
    return ResponseEntity.status(status).body(
      new ErrorBody(message, status.value(), request.getRequestURI(), Instant.now(), fields)
    );
  }

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> api(ApiException e, HttpServletRequest r) {
    return reply(e.status, e.getMessage(), r, Map.of());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e, HttpServletRequest r) {
    var fields = e
      .getBindingResult()
      .getFieldErrors()
      .stream()
      .collect(Collectors.toMap(x -> x.getField(), x -> x.getDefaultMessage(), (a, b) -> a));
    return reply(HttpStatus.BAD_REQUEST, "Please check the highlighted fields", r, fields);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorBody> forbidden(AccessDeniedException e, HttpServletRequest r) {
    return reply(HttpStatus.FORBIDDEN, "This action is not permitted for your role", r, Map.of());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorBody> integrity(DataIntegrityViolationException e, HttpServletRequest r) {
    return reply(
      HttpStatus.CONFLICT,
      "This value already exists or conflicts with a related record",
      r,
      Map.of()
    );
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    IllegalArgumentException.class,
  })
  public ResponseEntity<ErrorBody> invalid(Exception e, HttpServletRequest r) {
    return reply(HttpStatus.BAD_REQUEST, "Invalid request. Check field values and formats", r, Map.of());
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorBody> upload(Exception e, HttpServletRequest r) {
    return reply(HttpStatus.PAYLOAD_TOO_LARGE, "Image must be smaller than 5 MB", r, Map.of());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorBody> unexpected(Exception e, HttpServletRequest r) {
    log.error("Request failed: {}", r.getRequestURI(), e);
    return reply(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "We could not complete this request. Please try again",
      r,
      Map.of()
    );
  }
}
