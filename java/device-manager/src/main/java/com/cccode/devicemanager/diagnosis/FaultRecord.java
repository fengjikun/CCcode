package com.cccode.devicemanager.diagnosis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fault_records")
public class FaultRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "device_type")
    private String deviceType;

    /** 症状列表，逗号分隔 */
    @Column(nullable = false, length = 1000)
    private String symptoms;

    @Column(length = 2000)
    private String description;

    /** LOW / MEDIUM / HIGH / CRITICAL */
    @Column(nullable = false)
    private String severity = "MEDIUM";

    /** OPEN / DIAGNOSING / RESOLVED */
    @Column(nullable = false)
    private String status = "OPEN";

    /** Claude 分析结果 JSON */
    @Column(name = "diagnosis_result", columnDefinition = "TEXT")
    private String diagnosisResult;

    @Column(name = "reported_at", updatable = false)
    private LocalDateTime reportedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        reportedAt = LocalDateTime.now();
    }

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }

    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDiagnosisResult() { return diagnosisResult; }
    public void setDiagnosisResult(String diagnosisResult) { this.diagnosisResult = diagnosisResult; }

    public LocalDateTime getReportedAt() { return reportedAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
