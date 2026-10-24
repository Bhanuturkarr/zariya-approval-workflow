package com.zariya.workflow.service;

import com.zariya.workflow.api.WorkspaceDto;
import com.zariya.workflow.api.WorkspaceDto.*;
import com.zariya.workflow.domain.*;
import com.zariya.workflow.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class WorkspaceService {
    private static final Set<String> STAGES = Set.of("Intake", "Review", "Documents", "EVC", "Decision", "Compliance", "Approved");
    private static final Set<String> DOC_STATUSES = Set.of("Pending", "Received", "Verified");
    private final ApplicationRepository applications;
    private final AlertRepository alerts;
    private final AuditRepository audit;

    public WorkspaceService(ApplicationRepository applications, AlertRepository alerts, AuditRepository audit) {
        this.applications = applications; this.alerts = alerts; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public WorkspaceDto workspace() {
        var cases = applications.findAll(Sort.by(Sort.Direction.DESC, "id"));
        var now = LocalDate.now();
        long awaiting = cases.stream().filter(a -> a.getStage().equals("Review") || a.getStage().equals("Intake")).count();
        long dueSoon = cases.stream().filter(a -> !a.getStage().equals("Approved") && a.getDueDate() != null && !a.getDueDate().isBefore(now) && !a.getDueDate().isAfter(now.plusDays(7))).count();
        long overdue = cases.stream().filter(a -> !a.getStage().equals("Approved") && a.getDueDate() != null && a.getDueDate().isBefore(now)).count();
        long allDocuments = cases.stream().mapToLong(a -> a.getDocuments().size()).sum();
        long completeDocuments = cases.stream().flatMap(a -> a.getDocuments().stream()).filter(d -> !d.getStatus().equals("Pending")).count();
        int compliance = allDocuments == 0 ? 0 : (int)Math.round(100.0 * completeDocuments / allDocuments);
        var summary = new Summary(cases.size(), awaiting, dueSoon, overdue, compliance);
        var appDtos = cases.stream().map(a -> new Application(a.getId(), a.getCaseId(), a.getInstitution(), a.getApplicationType(), a.getStage(), a.getOwner(), a.getRegion(), a.getDueDate(), a.getPriority(), a.getDocuments().stream().map(d -> new Document(d.getName(), d.getStatus())).toList())).toList();
        var alertDtos = alerts.findAll(Sort.by(Sort.Direction.DESC, "id")).stream().map(a -> new Alert(a.getId(), a.getLevel(), a.getTitle(), a.getBody(), a.getTimeLabel(), a.isAcknowledged())).toList();
        var auditDtos = audit.findAll(Sort.by(Sort.Direction.DESC, "id")).stream().limit(20).map(a -> new AuditEvent(a.getId(), a.getActor(), a.getAction(), a.getCaseId(), a.getDetail(), formatTime(a.getCreatedAt()))).toList();
        var regions = List.of("North", "South", "West", "East").stream().map(name -> {
            var regionDocs = cases.stream().filter(a -> a.getRegion().equals(name)).flatMap(a -> a.getDocuments().stream()).toList();
            long done = regionDocs.stream().filter(d -> !d.getStatus().equals("Pending")).count();
            return new Region(name, regionDocs.isEmpty() ? 0 : (int)Math.round(100.0 * done / regionDocs.size()));
        }).toList();
        return new WorkspaceDto(summary, appDtos, alertDtos, auditDtos, regions);
    }

    @Transactional
    public WorkspaceDto create(CreateApplication request) {
        String caseId = String.format("AICTE/26/%04d", 440 + applications.count() + 1);
        var app = new ApplicationRecord(caseId, request.institution().trim(), request.applicationType(), "Intake", safe(request.owner(), "Zariya"), request.region(), request.dueDate(), safe(request.priority(), "Normal"));
        app.addDocument("Application form", "Received");
        app.addDocument("Faculty details", "Pending");
        app.addDocument("Infrastructure report", "Pending");
        applications.save(app);
        record(safe(request.owner(), "Zariya"), "created application and routed it to", caseId, request.region() + " regional office");
        return workspace();
    }

    @Transactional
    public WorkspaceDto updateStage(long id, StageUpdate request) {
        if (!STAGES.contains(request.stage())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid workflow stage.");
        var app = getApplication(id);
        app.setStage(request.stage());
        record(safe(request.actor(), "Zariya"), "moved the application to " + request.stage(), app.getCaseId(), "Workflow stage updated");
        return workspace();
    }

    @Transactional
    public WorkspaceDto updateDocument(long id, DocumentUpdate request) {
        if (!DOC_STATUSES.contains(request.status())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose Pending, Received or Verified.");
        var app = getApplication(id);
        var document = app.getDocuments().stream().filter(d -> d.getName().equals(request.name())).findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found."));
        document.setStatus(request.status());
        record(safe(request.actor(), "Zariya"), "marked " + document.getName() + " as " + request.status().toLowerCase(), app.getCaseId(), "Document tracker updated");
        return workspace();
    }

    @Transactional
    public WorkspaceDto acknowledge(long id, ActorUpdate request) {
        var alert = alerts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found."));
        if (!alert.isAcknowledged()) {
            alert.setAcknowledged(true);
            String caseId = alert.getBody().contains(" · ") ? alert.getBody().split(" · ")[0] : "Workspace";
            record(safe(request.actor(), "Zariya"), "acknowledged alert", caseId, alert.getTitle());
        }
        return workspace();
    }

    @Transactional
    public void seedIfEmpty() {
        if (applications.count() > 0) return;
        var today = LocalDate.now();
        seedCase("AICTE/26/0418", "Mahatma Gandhi Institute of Technology", "Extension of approval", "Review", "R. Kulkarni", "West", today, "High", "Application form:Received", "Faculty details:Verified", "Infrastructure report:Pending");
        seedCase("AICTE/26/0421", "Coastal School of Engineering", "New institution", "Documents", "S. Iyer", "South", today.plusDays(3), "Normal", "Application form:Received", "Land documents:Pending", "Fire safety certificate:Pending");
        seedCase("AICTE/26/0396", "National Institute of Technology Studies", "Increase in intake", "EVC", "P. Deshmukh", "West", today.plusDays(4), "Normal", "Application form:Verified", "EVC visit report:Received", "Faculty details:Verified");
        seedCase("AICTE/26/0372", "Eastern Valley Technical University", "Extension of approval", "Compliance", "Zariya", "East", today.minusDays(2), "High", "Application form:Verified", "Compliance statement:Pending", "Audited accounts:Received");
        seedCase("AICTE/26/0430", "Saraswati College of Technology", "New programme", "Review", "N. Bose", "North", today.plusDays(6), "Normal", "Application form:Received", "Board resolution:Verified", "Faculty details:Received");
        seedCase("AICTE/26/0403", "Deccan Institute of Applied Sciences", "Extension of approval", "Documents", "R. Kulkarni", "West", today.plusDays(7), "Normal", "Application form:Received", "Infrastructure report:Pending", "Compliance statement:Received");
        seedCase("AICTE/26/0388", "Himalayan College of Engineering", "Increase in intake", "EVC", "N. Bose", "North", today.plusDays(10), "Normal", "Application form:Verified", "EVC visit report:Received", "Faculty details:Verified");
        seedCase("AICTE/26/0412", "Riverbend Institute of Technology", "Extension of approval", "Review", "S. Iyer", "South", today.plusDays(11), "Normal", "Application form:Received", "Faculty details:Pending", "Audited accounts:Received");
        alerts.saveAll(List.of(
            new AlertRecord("urgent", "Scrutiny deadline today", "AICTE/26/0418 · Mahatma Gandhi Institute of Technology", "Due today · action required"),
            new AlertRecord("urgent", "Compliance response overdue", "AICTE/26/0372 · Eastern Valley Technical University", "Overdue by 2 days · escalated to Regional Director"),
            new AlertRecord("", "EVC visit scheduled", "AICTE/26/0396 · National Institute of Technology Studies", "Due " + today.plusDays(4) + " · West regional office"),
            new AlertRecord("info", "Documents received", "AICTE/26/0421 · Coastal School of Engineering", "3 files uploaded · review required")
        ));
        audit.saveAll(List.of(
            new AuditRecord("R. Kulkarni", "completed preliminary scrutiny", "AICTE/26/0418", "Regional office, West"),
            new AuditRecord("System", "routed application to South regional office", "AICTE/26/0421", "Rule: institution location"),
            new AuditRecord("S. Iyer", "uploaded EVC report", "AICTE/26/0396", "Document verified")
        ));
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 10000)
    @Transactional
    public void createDeadlineAlerts() {
        LocalDate today = LocalDate.now();
        var allAlerts = alerts.findAll();
        for (var app : applications.findAll()) {
            if (app.getStage().equals("Approved") || app.getDueDate() == null) continue;
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, app.getDueDate());
            if (days > 2) continue;
            boolean alreadyRaised = allAlerts.stream().anyMatch(alert -> alert.getBody().startsWith(app.getCaseId() + " · "));
            if (alreadyRaised) continue;
            String title = days < 0 ? "Action overdue · escalation" : days == 0 ? "Action due today" : "Action due soon";
            String time = days < 0 ? "Overdue by " + Math.abs(days) + " days · escalated to Regional Director" : days == 0 ? "Due today · action required" : "Due in " + days + " days · assigned to " + app.getOwner();
            var alert = new AlertRecord(days < 0 ? "urgent" : "", title, app.getCaseId() + " · " + app.getInstitution(), time);
            alerts.save(alert);
            allAlerts.add(alert);
            if (days < 0) record("System", "escalated overdue action", app.getCaseId(), "Regional Director notified");
        }
    }

    private void seedCase(String caseId, String institution, String type, String stage, String owner, String region, LocalDate due, String priority, String... docs) {
        var app = new ApplicationRecord(caseId, institution, type, stage, owner, region, due, priority);
        for (String value : docs) { int split = value.lastIndexOf(':'); app.addDocument(value.substring(0, split), value.substring(split + 1)); }
        applications.save(app);
    }
    private ApplicationRecord getApplication(long id) { return applications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found.")); }
    private void record(String actor, String action, String caseId, String detail) { audit.save(new AuditRecord(actor, action, caseId, detail)); }
    private static String safe(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }
    private static String formatTime(LocalDateTime time) { return time.toLocalDate().equals(LocalDate.now()) ? "Today, " + time.format(DateTimeFormatter.ofPattern("h:mm a")) : time.format(DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a")); }
}
