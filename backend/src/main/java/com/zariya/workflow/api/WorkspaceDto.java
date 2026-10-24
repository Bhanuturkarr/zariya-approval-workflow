package com.zariya.workflow.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record WorkspaceDto(Summary summary, List<Application> applications, List<Alert> alerts, List<AuditEvent> audit, List<Region> regions) {
    public record Summary(long applicationsInCycle, long awaitingReview, long dueSoon, long overdue, int compliance) {}
    public record Application(long id, String caseId, String institution, String applicationType, String stage, String owner, String region, LocalDate dueDate, String priority, List<Document> documents) {}
    public record Document(String name, String status) {}
    public record Alert(long id, String level, String title, String body, String time, boolean acknowledged) {}
    public record AuditEvent(long id, String actor, String action, String caseId, String detail, String createdAt) {}
    public record Region(String name, int compliance) {}
    public record CreateApplication(String institution, String applicationType, String region, String owner, LocalDate dueDate, String priority) {}
    public record StageUpdate(String stage, String actor) {}
    public record DocumentUpdate(String name, String status, String actor) {}
    public record ActorUpdate(String actor) {}
}
