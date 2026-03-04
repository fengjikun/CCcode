package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "onto_link_types")
public class OntologyLinkType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "source_object_type_id", nullable = false)
    private Long sourceObjectTypeId;

    @Column(name = "target_object_type_id", nullable = false)
    private Long targetObjectTypeId;

    /** ONE_TO_ONE / ONE_TO_MANY / MANY_TO_MANY */
    private String cardinality = "MANY_TO_MANY";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public Long getSourceObjectTypeId() { return sourceObjectTypeId; }
    public void setSourceObjectTypeId(Long sourceObjectTypeId) { this.sourceObjectTypeId = sourceObjectTypeId; }

    public Long getTargetObjectTypeId() { return targetObjectTypeId; }
    public void setTargetObjectTypeId(Long targetObjectTypeId) { this.targetObjectTypeId = targetObjectTypeId; }

    public String getCardinality() { return cardinality; }
    public void setCardinality(String cardinality) { this.cardinality = cardinality; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
