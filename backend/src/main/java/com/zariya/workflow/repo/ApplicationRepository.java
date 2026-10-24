package com.zariya.workflow.repo;

import com.zariya.workflow.domain.ApplicationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<ApplicationRecord, Long> {}
