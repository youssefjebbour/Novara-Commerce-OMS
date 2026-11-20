package com.novara.api;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

  public final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public static ApiException bad(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message);
  }

  public static ApiException missing(String object) {
    return new ApiException(HttpStatus.NOT_FOUND, object + " not found");
  }

  public static ApiException denied() {
    return new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this resource");
  }

  public static ApiException unauthorized() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again");
  }
}
