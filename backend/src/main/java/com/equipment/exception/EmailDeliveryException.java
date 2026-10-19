package com.equipment.exception;

public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException() {
        super("Email delivery is temporarily unavailable. Please try again later.");
    }
}
