package com.equipment.repository;

import com.equipment.entity.BorrowRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, Long> {

    @Query("SELECT COUNT(b) FROM BorrowRequest b WHERE b.tenant.status = 'ACTIVE'")
    long countByTenantStatusActive();

    List<BorrowRequest> findByTenantId(Long tenantId);

    List<BorrowRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<BorrowRequest> findByTenantIdAndStatus(Long tenantId, String status);

    List<BorrowRequest> findByUserIdAndStatus(Long userId, String status);

    @Query("""
            select br
            from BorrowRequest br
            where br.tenant.status = 'ACTIVE'
            order by br.createdAt desc
            """)
    List<BorrowRequest> findRecentForActiveTenants(Pageable pageable);

    boolean existsByUserIdAndEquipmentIdAndStatusIn(Long userId, Long equipmentId, List<String> statuses);

    long countByUserIdAndStatusIn(Long userId, List<String> statuses);

    boolean existsByUserIdAndStatusInAndEndDateBefore(Long userId, List<String> statuses, LocalDate date);

    Page<BorrowRequest> findByTenantIdAndStatusAndEquipmentUnitIsNull(Long tenantId, String status, Pageable pageable);

    Page<BorrowRequest> findByTenantIdAndStatusAndEquipmentUnitIsNotNull(Long tenantId, String status, Pageable pageable);

    @Query(
            value = """
                    select br
                    from BorrowRequest br
                    join br.user u
                    join br.equipment e
                    left join br.equipmentUnit eu
                    where br.tenant.id = :tenantId
                      and (
                          :search is null
                          or lower(u.name) like lower(concat('%', :search, '%'))
                          or lower(u.email) like lower(concat('%', :search, '%'))
                          or lower(e.name) like lower(concat('%', :search, '%'))
                          or lower(coalesce(eu.serialNo, '')) like lower(concat('%', :search, '%'))
                      )
                      and (
                          :applyStatuses = false
                          or upper(br.status) in :statuses
                      )
                    """,
            countQuery = """
                    select count(br)
                    from BorrowRequest br
                    join br.user u
                    join br.equipment e
                    left join br.equipmentUnit eu
                    where br.tenant.id = :tenantId
                      and (
                          :search is null
                          or lower(u.name) like lower(concat('%', :search, '%'))
                          or lower(u.email) like lower(concat('%', :search, '%'))
                          or lower(e.name) like lower(concat('%', :search, '%'))
                          or lower(coalesce(eu.serialNo, '')) like lower(concat('%', :search, '%'))
                      )
                      and (
                          :applyStatuses = false
                          or upper(br.status) in :statuses
                      )
                    """
    )
    Page<BorrowRequest> searchByTenantWithFilters(@Param("tenantId") Long tenantId,
                                                   @Param("search") String search,
                                                   @Param("applyStatuses") boolean applyStatuses,
                                                   @Param("statuses") List<String> statuses,
                                                   Pageable pageable);

    @Query("""
            select upper(br.status), count(br)
            from BorrowRequest br
            where br.tenant.id = :tenantId
              and br.decidedAt >= :fromInclusive
              and br.decidedAt < :toExclusive
            group by upper(br.status)
            """)
    List<Object[]> countDecidedStatusesInPeriod(@Param("tenantId") Long tenantId,
                                                @Param("fromInclusive") Instant fromInclusive,
                                                @Param("toExclusive") Instant toExclusive);

    @Modifying
    @Transactional
    @Query("""
            update BorrowRequest br
            set br.status = 'CANCELLED',
                br.decisionReason = :note,
                br.decidedAt = :now,
                br.updatedAt = :now
            where br.tenant.id = :tenantId
              and upper(br.status) = 'PENDING'
            """)
    int cancelPendingByTenantId(@Param("tenantId") Long tenantId,
                                @Param("note") String note,
                                @Param("now") Instant now);

    @Modifying
    @Transactional
    int deleteByTenantId(Long tenantId);
}
