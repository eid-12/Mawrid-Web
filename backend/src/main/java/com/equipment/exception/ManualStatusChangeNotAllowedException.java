package com.equipment.exception;

public class ManualStatusChangeNotAllowedException extends RuntimeException {
    public ManualStatusChangeNotAllowedException(String message) {
        super(message);
    }
}
