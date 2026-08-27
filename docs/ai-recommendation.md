# AI catalog recommendation

Mawrid is a centralized resource and equipment rental platform for the University of Hail (UOH). **AI recommendation** personalizes the student catalog so the most relevant equipment appears first, with a **Recommended** badge on the top matches.

This page explains the ranking as it is implemented in this repository (not as a future design).

## Why it exists

Students browse equipment from every active college. Without ranking, the catalog is a long alphabetical list. Recommendation uses recent borrow behavior (the student, the college, and the whole university) to surface items they are more likely to need.

## How it works

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

## Related docs

- Product overview: [overview.md](overview.md)
- Auth and borrow flows: [user-flows.md](user-flows.md)
- REST catalog and auth routes: [api-reference.md](api-reference.md)
- JWT, OTP hashing, email notes: [security.md](security.md)
- Services list: [backend.md](backend.md)
