package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;

@Entity
@Table(name = "onto_properties")
public class OntologyProperty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_type_id", nullable = false)
    private Long objectTypeId;

    @Column(nullable = false)
    private String name;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    /** STRING / INTEGER / DOUBLE / BOOLEAN / DATE / DATETIME */
    @Column(name = "data_type", nullable = false)
    private String dataType;

    @Column(nullable = false)
    private boolean required = false;

    @Column(name = "default_value")
    private String defaultValue;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getObjectTypeId() { return objectTypeId; }
    public void setObjectTypeId(Long objectTypeId) { this.objectTypeId = objectTypeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }

    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
