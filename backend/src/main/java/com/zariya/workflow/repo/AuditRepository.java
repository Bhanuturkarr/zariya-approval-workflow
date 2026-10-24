package com.zariya.workflow.repo;

import com.zariya.workflow.domain.AuditRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRepository extends JpaRepository<AuditRecord, Long> {}
