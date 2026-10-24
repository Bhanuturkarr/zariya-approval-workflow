package com.zariya.workflow.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "workflow_alerts")
public class AlertRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 24)
    private String level;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false, length = 240)
    private String body;
    @Column(nullable = false, length = 180)
    private String timeLabel;
    @Column(nullable = false)
    private boolean acknowledged;

    protected AlertRecord() {}
    public AlertRecord(String level, String title, String body, String timeLabel) { this.level=level; this.title=title; this.body=body; this.timeLabel=timeLabel; }
    public Long getId() { return id; }
    public String getLevel() { return level; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getTimeLabel() { return timeLabel; }
    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
}
