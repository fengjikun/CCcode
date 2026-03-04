package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "onto_functions")
public class OntologyFunction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 可选：关联到某个 ActionType */
    @Column(name = "action_type_id")
    private Long actionTypeId;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** GROOVY */
    @Column(name = "script_type", nullable = false)
    private String scriptType = "GROOVY";

    @Column(name = "script_content", columnDefinition = "TEXT")
    private String scriptContent;

    @Column(name = "input_schema_json", columnDefinition = "TEXT")
    private String inputSchemaJson;

    @Column(name = "output_schema_json", columnDefinition = "TEXT")
    private String outputSchemaJson;

    /** ACTIVE / DRAFT / DEPRECATED */
    @Column(nullable = false)
    private String status = "DRAFT";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getActionTypeId() { return actionTypeId; }
    public void setActionTypeId(Long actionTypeId) { this.actionTypeId = actionTypeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getScriptType() { return scriptType; }
    public void setScriptType(String scriptType) { this.scriptType = scriptType; }

    public String getScriptContent() { return scriptContent; }
    public void setScriptContent(String scriptContent) { this.scriptContent = scriptContent; }

    public String getInputSchemaJson() { return inputSchemaJson; }
    public void setInputSchemaJson(String inputSchemaJson) { this.inputSchemaJson = inputSchemaJson; }

    public String getOutputSchemaJson() { return outputSchemaJson; }
    public void setOutputSchemaJson(String outputSchemaJson) { this.outputSchemaJson = outputSchemaJson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
