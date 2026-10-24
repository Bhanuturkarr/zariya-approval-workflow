package com.zariya.workflow.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "application_documents")
public class TrackedDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private ApplicationRecord application;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, length = 20)
    private String status;

    protected TrackedDocument() {}
    TrackedDocument(ApplicationRecord application, String name, String status) { this.application = application; this.name = name; this.status = status; }
    public String getName() { return name; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
