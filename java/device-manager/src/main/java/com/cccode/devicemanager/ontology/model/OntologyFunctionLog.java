package com.cccode.devicemanager.ontology.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "onto_function_logs")
public class OntologyFunctionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "function_id", nullable = false)
    private Long functionId;

    /** 可选：关联到某次 ActionExecution */
    @Column(name = "action_execution_id")
    private Long actionExecutionId;

    @Column(name = "input_data_json", columnDefinition = "TEXT")
    private String inputDataJson;

    @Column(name = "output_data_json", columnDefinition = "TEXT")
    private String outputDataJson;

    /** SUCCESS / FAILED / TIMEOUT */
    @Column(nullable = false)
    private String status = "FAILED";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "executed_at", updatable = false)
    private LocalDateTime executedAt;

    @PrePersist
    protected void onCreate() {
        executedAt = LocalDateTime.now();
    }

    // ===== Getters & Setters =====
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFunctionId() { return functionId; }
    public void setFunctionId(Long functionId) { this.functionId = functionId; }

    public Long getActionExecutionId() { return actionExecutionId; }
    public void setActionExecutionId(Long actionExecutionId) { this.actionExecutionId = actionExecutionId; }

    public String getInputDataJson() { return inputDataJson; }
    public void setInputDataJson(String inputDataJson) { this.inputDataJson = inputDataJson; }

    public String getOutputDataJson() { return outputDataJson; }
    public void setOutputDataJson(String outputDataJson) { this.outputDataJson = outputDataJson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public LocalDateTime getExecutedAt() { return executedAt; }
}
