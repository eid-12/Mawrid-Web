package com.equipment.exception;

public class AccountInactiveException extends RuntimeException {
    public AccountInactiveException() {
        super("Account Inactive");
    }

    public AccountInactiveException(String message) {
        super(message);
    }
}
