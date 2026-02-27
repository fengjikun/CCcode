package com.cccode.devicemanager.diagnosis;

import java.util.List;

public class DiagnosisRequest {
    private Long         deviceId;
    private String       deviceName;
    private String       deviceType;
    /** 现象级问题 ID（如 phen_w_limit），优先级高于 symptoms 关键词 */
    private String       phenomenonId;
    /** 补充症状关键词列表（可选） */
    private List<String> symptoms;
    private String       description;
    private String       severity = "MEDIUM";

    public Long getDeviceId()                { return deviceId; }
    public void setDeviceId(Long deviceId)   { this.deviceId = deviceId; }

    public String getDeviceName()                     { return deviceName; }
    public void   setDeviceName(String deviceName)    { this.deviceName = deviceName; }

    public String getDeviceType()                     { return deviceType; }
    public void   setDeviceType(String deviceType)    { this.deviceType = deviceType; }

    public String getPhenomenonId()                       { return phenomenonId; }
    public void   setPhenomenonId(String phenomenonId)    { this.phenomenonId = phenomenonId; }

    public List<String> getSymptoms()                       { return symptoms; }
    public void         setSymptoms(List<String> symptoms)  { this.symptoms = symptoms; }

    public String getDescription()                        { return description; }
    public void   setDescription(String description)      { this.description = description; }

    public String getSeverity()                       { return severity; }
    public void   setSeverity(String severity)        { this.severity = severity; }
}
