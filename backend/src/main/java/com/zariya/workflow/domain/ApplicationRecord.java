package com.zariya.workflow.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "applications")
public class ApplicationRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 32)
    private String caseId;
    @Column(nullable = false, length = 200)
    private String institution;
    @Column(nullable = false, length = 80)
    private String applicationType;
    @Column(nullable = false, length = 24)
    private String stage;
    @Column(nullable = false, length = 80)
    private String owner;
    @Column(nullable = false, length = 24)
    private String region;
    private LocalDate dueDate;
    @Column(nullable = false, length = 16)
    private String priority = "Normal";
    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id ASC")
    private List<TrackedDocument> documents = new ArrayList<>();

    protected ApplicationRecord() {}
    public ApplicationRecord(String caseId, String institution, String applicationType, String stage, String owner, String region, LocalDate dueDate, String priority) {
        this.caseId = caseId; this.institution = institution; this.applicationType = applicationType;
        this.stage = stage; this.owner = owner; this.region = region; this.dueDate = dueDate;
        this.priority = priority == null || priority.isBlank() ? "Normal" : priority;
    }
    public void addDocument(String name, String status) { documents.add(new TrackedDocument(this, name, status)); }
    public Long getId() { return id; }
    public String getCaseId() { return caseId; }
    public String getInstitution() { return institution; }
    public String getApplicationType() { return applicationType; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getOwner() { return owner; }
    public String getRegion() { return region; }
    public LocalDate getDueDate() { return dueDate; }
    public String getPriority() { return priority; }
    public List<TrackedDocument> getDocuments() { return documents; }
}
