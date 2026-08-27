package com.equipment.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Caps burst traffic on public email endpoints from one client IP.
 * Per-user 60s cooldown still applies in AuthEmailTransactionService; this stops a flood of different addresses.
 */
@Component
public class AuthEmailRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> EMAIL_POST_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/forgot-password",
            "/api/auth/resend-verification"
    );
    private static final int MAX_REQUESTS = 20;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> hitsByIp = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return !matchesEmailPost(request);
    }

    private static boolean matchesEmailPost(HttpServletRequest request) {
        String path = request.getServletPath();
        String uri = request.getRequestURI();
        for (String allowed : EMAIL_POST_PATHS) {
            if (allowed.equals(path) || (uri != null && (uri.equals(allowed) || uri.endsWith(allowed)))) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String ip = clientIp(request);
        long now = System.currentTimeMillis();
        Deque<Long> hits = hitsByIp.computeIfAbsent(ip, key -> new ArrayDeque<>());
        synchronized (hits) {
            while (!hits.isEmpty() && now - hits.peekFirst() > WINDOW_MS) {
                hits.pollFirst();
            }
            if (hits.size() >= MAX_REQUESTS) {
                response.setStatus(429);
                response.setHeader("Retry-After", "60");
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                response.getWriter().write(
                        "{\"error\":\"A verification code was already sent to your email. Please wait 60 seconds, then try again.\"}"
                );
                return;
            }
            hits.addLast(now);
        }
        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
