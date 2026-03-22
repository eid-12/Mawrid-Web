package com.equipment.exception;

/**
 * Thrown when an ADMIN attempts to log in (or refresh) while their linked college/tenant is not ACTIVE.
 */
public class CollegeDeactivatedException extends RuntimeException {

    public static final String ERROR_CODE = "COLLEGE_INACTIVE";

    public CollegeDeactivatedException(String message) {
        super(message);
    }
}
