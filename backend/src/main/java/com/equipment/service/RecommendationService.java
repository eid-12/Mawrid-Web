package com.equipment.service;

import com.equipment.dto.EquipmentDto;
import com.equipment.entity.Equipment;
import com.equipment.repository.CatalogRecommendationProjection;
import com.equipment.repository.EquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final EquipmentRepository equipmentRepository;
    private static final int RECOMMENDED_LIMIT = 3;

    public record RankedCatalog(List<Equipment> equipmentOrdered,
                                Map<Long, Double> scoreByEquipmentId,
                                int recommendedCutoffCount) {}

    public RankedCatalog rankCatalogForUser(Long userId, Long collegeTenantId) {
        Instant sinceThirtyDays = Instant.now().minus(30, ChronoUnit.DAYS);
        Long safeTenantId = collegeTenantId != null ? collegeTenantId : -1L;
        List<CatalogRecommendationProjection> ranked;
        try {
            ranked = equipmentRepository.rankCatalogByRecommendation(
                    userId,
                    safeTenantId,
                    sinceThirtyDays
            );
        } catch (RuntimeException ex) {
            List<Equipment> fallbackEquipment = equipmentRepository.findActiveCatalogFallback();
            int fallbackRecommendedCount = Math.min(RECOMMENDED_LIMIT, fallbackEquipment.size());
            Map<Long, Double> zeroScores = new HashMap<>();
            fallbackEquipment.forEach(e -> zeroScores.put(e.getId(), 0d));
            return new RankedCatalog(fallbackEquipment, zeroScores, fallbackRecommendedCount);
        }

        if (ranked.isEmpty()) {
            List<Equipment> fallbackEquipment = equipmentRepository.findActiveCatalogFallback();
            if (fallbackEquipment.isEmpty()) {
                return new RankedCatalog(List.of(), Collections.emptyMap(), 0);
            }
            int fallbackRecommendedCount = Math.min(RECOMMENDED_LIMIT, fallbackEquipment.size());
            Map<Long, Double> zeroScores = new HashMap<>();
            fallbackEquipment.forEach(e -> zeroScores.put(e.getId(), 0d));
            return new RankedCatalog(fallbackEquipment, zeroScores, fallbackRecommendedCount);
        }

        List<Long> orderedIds = ranked.stream()
                .map(CatalogRecommendationProjection::getEquipmentId)
                .toList();

        Map<Long, Equipment> byId = equipmentRepository.findAllById(orderedIds).stream()
                .collect(Collectors.toMap(Equipment::getId, e -> e));

        List<Equipment> orderedEquipment = orderedIds.stream()
                .map(byId::get)
                .filter(e -> e != null)
                .toList();

        Map<Long, Double> scoreById = new HashMap<>();
        ranked.forEach(r -> scoreById.put(r.getEquipmentId(), r.getRelevanceScore() != null ? r.getRelevanceScore() : 0d));

        int recommendedCount = Math.min(RECOMMENDED_LIMIT, orderedEquipment.size());
        return new RankedCatalog(orderedEquipment, scoreById, recommendedCount);
    }

    public void enrichRecommendationMeta(List<EquipmentDto> dtos,
                                         Map<Long, Double> scoreById,
                                         int recommendedCutoffCount) {
        if (dtos == null || dtos.isEmpty()) return;
        for (int i = 0; i < dtos.size(); i++) {
            EquipmentDto dto = dtos.get(i);
            double score = scoreById.getOrDefault(dto.getId(), 0d);
            dto.setRelevanceScore(score);
            dto.setRecommended(i < recommendedCutoffCount);
        }
    }
}

