package com.equipment.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(AccountInactiveException.class)
    public ResponseEntity<Map<String, Object>> handleInactive(AccountInactiveException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(CollegeDeactivatedException.class)
    public ResponseEntity<Map<String, Object>> handleCollegeDeactivated(CollegeDeactivatedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", ex.getMessage(),
                        "code", CollegeDeactivatedException.ERROR_CODE
                ));
    }

    @ExceptionHandler(CollegeRemovedException.class)
    public ResponseEntity<Map<String, Object>> handleCollegeRemoved(CollegeRemovedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", ex.getMessage(),
                        "code", CollegeRemovedException.ERROR_CODE
                ));
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Map<String, Object>> handleNotVerified(EmailNotVerifiedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ManualStatusChangeNotAllowedException.class)
    public ResponseEntity<Map<String, Object>> handleManualStatusChangeNotAllowed(ManualStatusChangeNotAllowedException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyRequests(TooManyRequestsException ex) {
        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String raw = rootMessage(ex);
        String msg = raw != null && raw.toLowerCase().contains("foreign key")
                ? "Cannot delete: this item is referenced by other data. Remove related records first."
                : (raw != null ? raw : "Database constraint violation");
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", msg));
    }

    @ExceptionHandler({TransactionSystemException.class, JpaSystemException.class})
    public ResponseEntity<Map<String, Object>> handleTransactionFailure(Exception ex) {
        String raw = rootMessage(ex);
        String msg = (raw != null && !raw.isBlank()) ? raw : "Database transaction failed";
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", msg));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuth(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Invalid email or password"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        String raw = rootMessage(ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", raw != null ? raw : "Internal server error"));
    }

    private String rootMessage(Throwable ex) {
        if (ex == null) return null;
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        String msg = current.getMessage();
        if (msg == null || msg.isBlank()) {
            msg = ex.getMessage();
        }
        return msg;
    }
}
