package com.equipment.repository;

import com.equipment.entity.Equipment;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    List<Equipment> findByTenantId(Long tenantId);

    List<Equipment> findByTenantIdAndCategory(Long tenantId, String category);

    @Query("""
            select e
            from Equipment e
            where e.tenant.id = :tenantId
              and lower(trim(e.name)) = lower(trim(:name))
            """)
    Optional<Equipment> findByTenantIdAndNormalizedName(@Param("tenantId") Long tenantId,
                                                         @Param("name") String name);

    @Modifying(flushAutomatically = true)
    @Query("""
            update Equipment e
               set e.availableQuantity = case
                    when (coalesce(e.availableQuantity, 0) + :delta) < 0 then 0
                    else (coalesce(e.availableQuantity, 0) + :delta)
               end
             where e.id = :equipmentId
               and e.tenant.id = :tenantId
            """)
    int adjustAvailableQuantity(@Param("tenantId") Long tenantId,
                                @Param("equipmentId") Long equipmentId,
                                @Param("delta") int delta);

    @Modifying(flushAutomatically = true)
    @Query(value = """
            update equipment e
            left join (
                select
                    eu.equipment_id as equipment_id,
                    count(*) as total_units,
                    sum(case when upper(eu.status) = 'AVAILABLE' then 1 else 0 end) as available_units
                from equipment_units eu
                where eu.equipment_id = :equipmentId
                group by eu.equipment_id
            ) x on x.equipment_id = e.id
            set
                e.total_quantity = coalesce(x.total_units, 0),
                e.available_quantity = coalesce(x.available_units, 0)
            where e.id = :equipmentId
              and e.tenant_id = :tenantId
            """, nativeQuery = true)
    int syncQuantitiesFromUnits(@Param("tenantId") Long tenantId,
                                @Param("equipmentId") Long equipmentId);

    @Modifying
    int deleteByTenantId(Long tenantId);

    @Query(value = """
            select
                e.id as equipmentId,
                (
                    (case when ua.category is not null then 50 else 0 end) * 0.40
                    +
                    coalesce(ct.college_requests_30d, 0) * 0.35
                    +
                    coalesce(gp.global_checkouts, 0) * 0.125
                ) as relevanceScore
            from equipment e
            join tenants t on t.id = e.tenant_id
            left join (
                select distinct lower(coalesce(e2.category, '')) as category
                from borrow_requests br
                join equipment e2 on e2.id = br.equipment_id
                join (
                    select br0.id
                    from borrow_requests br0
                    where (:userId is not null and br0.user_id = :userId)
                    order by br0.created_at desc
                    limit 5
                ) recent on recent.id = br.id
            ) ua on ua.category = lower(coalesce(e.category, ''))
            left join (
                select
                    br_col.equipment_id as equipment_id,
                    count(*) as college_requests_30d
                from borrow_requests br_col
                where br_col.tenant_id = :collegeTenantId
                  and br_col.created_at >= :sinceThirtyDays
                group by br_col.equipment_id
            ) ct on ct.equipment_id = e.id
            left join (
                select
                    br_pop.equipment_id as equipment_id,
                    count(*) as global_checkouts
                from check_transactions trx
                join borrow_requests br_pop on br_pop.id = trx.request_id
                where upper(trx.action) = 'CHECK_OUT'
                group by br_pop.equipment_id
            ) gp on gp.equipment_id = e.id
            where upper(t.status) = 'ACTIVE'
            order by relevanceScore desc, e.name asc
            """, nativeQuery = true)
    List<CatalogRecommendationProjection> rankCatalogByRecommendation(@Param("userId") Long userId,
                                                                      @Param("collegeTenantId") Long collegeTenantId,
                                                                      @Param("sinceThirtyDays") Instant sinceThirtyDays);

    @Query(value = """
            select e.*
            from equipment e
            join tenants t on t.id = e.tenant_id
            where upper(t.status) = 'ACTIVE'
            order by e.name asc
            """, nativeQuery = true)
    List<Equipment> findActiveCatalogFallback();
}
