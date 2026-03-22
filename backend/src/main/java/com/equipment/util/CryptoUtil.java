package com.equipment.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

public final class CryptoUtil {

    private static final SecureRandom RNG = new SecureRandom();

    private CryptoUtil() {
    }

    public static String randomUrlToken(int bytes) {
        byte[] buf = new byte[bytes];
        RNG.nextBytes(buf);
        return base64UrlNoPadding(buf);
    }

    /** Generate a 6-digit OTP (000000–999999) for password reset. */
    public static String randomOtp6() {
        int otp = RNG.nextInt(1_000_000);
        return String.format("%06d", otp);
    }

    /** Generate a random password: 8–10 chars, mixed case and numbers. */
    public static String randomPassword(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(RNG.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return toHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String base64UrlNoPadding(byte[] bytes) {
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String toHex(byte[] bytes) {
        char[] hexArray = "0123456789abcdef".toCharArray();
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = hexArray[v >>> 4];
            hexChars[j * 2 + 1] = hexArray[v & 0x0F];
        }
        return new String(hexChars);
    }
}

