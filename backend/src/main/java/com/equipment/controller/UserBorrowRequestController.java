package com.equipment.controller;

import com.equipment.dto.BorrowRequestDto;
import com.equipment.dto.UserCreateBorrowRequestDto;
import com.equipment.entity.UserRole;
import com.equipment.security.AppUserPrincipal;
import com.equipment.security.TenantAccess;
import com.equipment.service.BorrowRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/borrow-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class UserBorrowRequestController {

    private final BorrowRequestService borrowRequestService;

    @PostMapping
    public ResponseEntity<BorrowRequestDto> create(
            @PathVariable Long userId,
            @Valid @RequestBody UserCreateBorrowRequestDto dto,
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        if (principal == null || !principal.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Forbidden");
        }
        BorrowRequestDto created = borrowRequestService.createRequestByUser(userId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<BorrowRequestDto>> listByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        if (!TenantAccess.hasRole(UserRole.ADMIN) && !TenantAccess.hasRole(UserRole.SUPER_ADMIN)) {
            if (principal == null || !principal.getUserId().equals(userId)) {
                throw new IllegalArgumentException("Forbidden");
            }
        }
        return ResponseEntity.ok(borrowRequestService.getByUser(userId));
    }

    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<BorrowRequestDto> cancel(
            @PathVariable Long userId,
            @PathVariable Long requestId,
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        if (principal == null || !principal.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Forbidden");
        }
        return ResponseEntity.ok(borrowRequestService.cancel(requestId, userId));
    }
}
