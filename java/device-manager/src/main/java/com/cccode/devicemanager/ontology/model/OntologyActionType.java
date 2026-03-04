package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "onto_action_types")
public class OntologyActionType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** ACTIVE / DRAFT / DEPRECATED */
    @Column(nullable = false)
    private String status = "DRAFT";

    /** 操作的目标 ObjectType ID（nullable，可操作多种实体） */
    @Column(name = "target_object_type_id")
    private Long targetObjectTypeId;

    /** MANUAL / EVENT / SCHEDULE */
    @Column(name = "trigger_type")
    private String triggerType = "MANUAL";

    /** 触发配置 JSON（事件条件、Cron 表达式等） */
    @Column(name = "trigger_config_json", columnDefinition = "TEXT")
    private String triggerConfigJson;

    /** 异常策略：IGNORE / ROLLBACK / RETRY */
    @Column(name = "exception_policy")
    private String exceptionPolicy = "ROLLBACK";

    /** 异常处理配置 JSON（重试次数、延迟等） */
    @Column(name = "exception_config_json", columnDefinition = "TEXT")
    private String exceptionConfigJson;

    /** 业务校验规则 JSON 数组 */
    @Column(name = "validation_rules_json", columnDefinition = "TEXT")
    private String validationRulesJson;

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

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getTargetObjectTypeId() { return targetObjectTypeId; }
    public void setTargetObjectTypeId(Long targetObjectTypeId) { this.targetObjectTypeId = targetObjectTypeId; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getTriggerConfigJson() { return triggerConfigJson; }
    public void setTriggerConfigJson(String triggerConfigJson) { this.triggerConfigJson = triggerConfigJson; }

    public String getExceptionPolicy() { return exceptionPolicy; }
    public void setExceptionPolicy(String exceptionPolicy) { this.exceptionPolicy = exceptionPolicy; }

    public String getExceptionConfigJson() { return exceptionConfigJson; }
    public void setExceptionConfigJson(String exceptionConfigJson) { this.exceptionConfigJson = exceptionConfigJson; }

    public String getValidationRulesJson() { return validationRulesJson; }
    public void setValidationRulesJson(String validationRulesJson) { this.validationRulesJson = validationRulesJson; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
