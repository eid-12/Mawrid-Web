package com.equipment.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {
    @Test
    void malformedJsonReturnsBadRequest() {
        var response = new GlobalExceptionHandler()
                .handleMalformedJson(new HttpMessageNotReadableException("bad json"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Invalid JSON request body", response.getBody().get("error"));
    }
}
