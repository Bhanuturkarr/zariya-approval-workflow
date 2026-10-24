package com.zariya.workflow.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_events")
public class AuditRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 80)
    private String actor;
    @Column(nullable = false, length = 180)
    private String action;
    @Column(nullable = false, length = 32)
    private String caseId;
    @Column(nullable = false, length = 180)
    private String detail;
    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected AuditRecord() {}
    public AuditRecord(String actor, String action, String caseId, String detail) {
        this.actor=actor; this.action=action; this.caseId=caseId; this.detail=detail; this.createdAt=LocalDateTime.now();
    }
    public Long getId() { return id; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getCaseId() { return caseId; }
    public String getDetail() { return detail; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
