package com.equipment.repository;

import com.equipment.entity.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findByCode(String code);

    boolean existsByCode(String code);

    long countByStatus(String status);

    List<Tenant> findByStatusOrderByNameAsc(String status);

    @Query("""
            select t
            from Tenant t
            where (
                    :q is null
                    or trim(:q) = ''
                    or lower(t.name) like lower(concat('%', :q, '%'))
                    or lower(t.code) like lower(concat('%', :q, '%'))
                    or lower(coalesce(t.email, '')) like lower(concat('%', :q, '%'))
                  )
            """)
    Page<Tenant> search(@Param("q") String q, Pageable pageable);
}
