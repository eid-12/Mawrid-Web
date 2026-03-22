package com.equipment.exception;

/**
 * Thrown when a user account is linked to a college that was permanently removed.
 */
public class CollegeRemovedException extends RuntimeException {

    public static final String ERROR_CODE = "COLLEGE_REMOVED";

    public CollegeRemovedException(String message) {
        super(message);
    }
}
