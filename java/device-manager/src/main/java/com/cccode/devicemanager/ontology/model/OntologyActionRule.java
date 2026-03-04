package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;

@Entity
@Table(name = "onto_action_rules")
public class OntologyActionRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_type_id", nullable = false)
    private Long actionTypeId;

    /** CREATE_OBJECT / MODIFY_OBJECT / DELETE_OBJECT / CREATE_LINK / DELETE_LINK */
    @Column(name = "rule_type", nullable = false)
    private String ruleType;

    @Column(name = "target_object_type_name")
    private String targetObjectTypeName;

    @Column(name = "target_link_type_name")
    private String targetLinkTypeName;

    @Column(name = "property_mappings_json", columnDefinition = "TEXT")
    private String propertyMappingsJson;

    @Column(name = "condition_json", columnDefinition = "TEXT")
    private String conditionJson;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getActionTypeId() { return actionTypeId; }
    public void setActionTypeId(Long actionTypeId) { this.actionTypeId = actionTypeId; }

    public String getRuleType() { return ruleType; }
    public void setRuleType(String ruleType) { this.ruleType = ruleType; }

    public String getTargetObjectTypeName() { return targetObjectTypeName; }
    public void setTargetObjectTypeName(String targetObjectTypeName) { this.targetObjectTypeName = targetObjectTypeName; }

    public String getTargetLinkTypeName() { return targetLinkTypeName; }
    public void setTargetLinkTypeName(String targetLinkTypeName) { this.targetLinkTypeName = targetLinkTypeName; }

    public String getPropertyMappingsJson() { return propertyMappingsJson; }
    public void setPropertyMappingsJson(String propertyMappingsJson) { this.propertyMappingsJson = propertyMappingsJson; }

    public String getConditionJson() { return conditionJson; }
    public void setConditionJson(String conditionJson) { this.conditionJson = conditionJson; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
