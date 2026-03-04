package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "onto_links")
public class OntologyLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "link_type_id", nullable = false)
    private Long linkTypeId;

    @Column(name = "source_object_id", nullable = false)
    private Long sourceObjectId;

    @Column(name = "target_object_id", nullable = false)
    private Long targetObjectId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getLinkTypeId() { return linkTypeId; }
    public void setLinkTypeId(Long linkTypeId) { this.linkTypeId = linkTypeId; }

    public Long getSourceObjectId() { return sourceObjectId; }
    public void setSourceObjectId(Long sourceObjectId) { this.sourceObjectId = sourceObjectId; }

    public Long getTargetObjectId() { return targetObjectId; }
    public void setTargetObjectId(Long targetObjectId) { this.targetObjectId = targetObjectId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
