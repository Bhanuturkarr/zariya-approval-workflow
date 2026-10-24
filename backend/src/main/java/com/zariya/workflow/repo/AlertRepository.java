package com.zariya.workflow.repo;

import com.zariya.workflow.domain.AlertRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<AlertRecord, Long> {}
