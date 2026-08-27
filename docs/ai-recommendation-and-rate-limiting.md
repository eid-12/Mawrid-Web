# Mawrid System with AI Recommendation and Rate Limiting

Mawrid is a centralized resource and equipment rental platform for the University of Hail (UOH). Two product features sit on top of that core flow:

1. **AI recommendation** — personalizes the student catalog so the most relevant equipment appears first, with a **Recommended** badge on the top matches.
2. **Rate limiting** — protects signup, verification, and password-reset email so OTP messages cannot be spammed.

This page explains both features as they are implemented in this repository (not as a future design).

## Why they exist

Students browse equipment from every active college. Without ranking, the catalog is a long alphabetical list. Recommendation uses recent borrow behavior (the student, the college, and the whole university) to surface items they are more likely to need.

Auth emails (registration OTP, resend, forgot-password OTP) go through SMTP. Without a cooldown, a scripted client could request hundreds of messages per minute. Rate limiting returns **HTTP 429** and asks the user to wait 60 seconds.

---

## AI recommendation

This is a **scored ranking engine**, not a chat LLM. The backend computes a `relevanceScore` per equipment row, sorts the catalog by that score, and marks the top items as recommended.

### What the student sees

- Route: `/user/catalog`
- API: `GET /api/catalog/equipment`
- Each card may include `recommended: true` and `relevanceScore`
- Recommended cards get a blue ring and a **Recommended** badge

Only the **user catalog** is ranked this way. College inventory screens (`/admin/inventory`) stay as operational lists.

### Ranking pipeline

```
GET /api/catalog/equipment
        │
        ▼
EquipmentService.getCatalogForUser(userId, tenantId)
        │
        ▼
RecommendationService.rankCatalogForUser(...)
        │
        ├── SQL rankCatalogByRecommendation
        │     (score + order by score desc, name asc)
        │
        └── fallback: active equipment A–Z
              (if the ranking query fails or returns nothing)
        │
        ▼
enrichRecommendationMeta
  • copy relevanceScore onto each DTO
  • recommended = true for the first 3 items (RECOMMENDED_LIMIT)
```

A user whose college was deleted (`tenantId` is null) receives an empty catalog. No ranking runs in that case.

### Score formula

Native SQL in `EquipmentRepository.rankCatalogByRecommendation` builds one score per equipment row:

| Signal | How it is measured | Weight in the sum |
|--------|--------------------|-------------------|
| Personal category match | `50` if the item’s category matches any of the user’s **last 5** borrow requests, else `0` | × **0.40** (so a match adds **20**) |
| College demand | Count of borrow requests for that item in the student’s college in the **last 30 days** | × **0.35** |
| University popularity | Count of `CHECK_OUT` transactions for that item across all colleges | × **0.125** |

Only equipment belonging to **active** colleges is included. Ties break by equipment name (A–Z).

### Recommended badge

`RecommendationService` keeps `RECOMMENDED_LIMIT = 3`. After the list is ordered by score, the first three rows get `recommended = true`. The rest stay in score order but are not badged.

If ranking falls back to A–Z, the first three items in that fallback list are still marked recommended so the UI always has a short “start here” set when the catalog is not empty.

### Code map

| Layer | Location |
|-------|----------|
| SQL score | `backend/src/main/java/com/equipment/repository/EquipmentRepository.java` (`rankCatalogByRecommendation`) |
| Ranking + badge cutoff | `backend/src/main/java/com/equipment/service/RecommendationService.java` |
| Catalog API wiring | `backend/src/main/java/com/equipment/service/EquipmentService.java` (`getCatalogForUser`) |
| JSON fields | `backend/src/main/java/com/equipment/dto/EquipmentDto.java` (`relevanceScore`, `recommended`) |
| Catalog UI | `frontend/src/app/pages/user/Catalog.tsx` |

---

## Rate limiting

Mawrid rate-limits **outbound auth email**, not every HTTP route. Login itself is not throttled by this mechanism. The limit is **one email send per user per 60 seconds**.

### Protected actions

| Action | Endpoint | Effect |
|--------|----------|--------|
| Signup | `POST /api/auth/register` | Creates the account, then sends a registration OTP — blocked if the same user requested mail less than 60s ago |
| Resend verification | `POST /api/auth/resend-verification` | Same 60s cooldown |
| Forgot password | `POST /api/auth/forgot-password` | Same 60s cooldown |

Cooldown state is stored on the user row: `users.last_sent_at`. `AuthService.enforceEmailCooldown` compares that timestamp to now. If the wait is still active, it throws `TooManyRequestsException`.

### HTTP response

`GlobalExceptionHandler` maps that exception to:

- Status: **429 Too Many Requests**
- Body: `{ "error": "Please wait 60 seconds before requesting another email." }`

OTP codes themselves still expire independently (registration OTP default **10 minutes**, reset OTP default **5 minutes**). Rate limiting only spaces out **sends**.

### Frontend cooldown

The verification page (`frontend/src/app/pages/Verification.tsx`) also keeps a **60 second** resend timer in `localStorage` (`verification_resend_until_<email>`). That stops accidental double-clicks. The backend cooldown is the real control: even if the browser timer is cleared, a fourth request inside 60 seconds still returns 429.

### Code map

| Layer | Location |
|-------|----------|
| 60s constant + cooldown check | `backend/src/main/java/com/equipment/service/AuthService.java` (`EMAIL_SEND_COOLDOWN_SECONDS`, `enforceEmailCooldown`) |
| Exception type | `backend/src/main/java/com/equipment/exception/TooManyRequestsException.java` |
| HTTP 429 mapping | `backend/src/main/java/com/equipment/exception/GlobalExceptionHandler.java` |
| Timestamp column | `User.lastSentAt` |
| Resend timer UI | `frontend/src/app/pages/Verification.tsx` |

---

## Related docs

- Product overview: [overview.md](overview.md)
- Auth and borrow flows: [user-flows.md](user-flows.md)
- REST catalog and auth routes: [api-reference.md](api-reference.md)
- JWT, OTP hashing, email notes: [security.md](security.md)
- Services list: [backend.md](backend.md)
