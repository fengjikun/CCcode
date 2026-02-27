package com.cccode.devicemanager.diagnosis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 故障诊断 Agent — 使用 Claude API tool-use 循环分析故障，结合知识图谱给出排查方案。
 */
@Service
public class FaultDiagnosisService {

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_AGENT_ROUNDS = 5;

    @Value("${claude.api.key:}")
    private String apiKey;

    @Value("${claude.model:claude-opus-4-6}")
    private String model;

    private final RestTemplate restTemplate;
    private final FaultKnowledgeService knowledgeService;
    private final FaultRecordRepository recordRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public FaultDiagnosisService(RestTemplate restTemplate,
                                 FaultKnowledgeService knowledgeService,
                                 FaultRecordRepository recordRepository) {
        this.restTemplate = restTemplate;
        this.knowledgeService = knowledgeService;
        this.recordRepository = recordRepository;
    }

    /**
     * 执行故障诊断：保存记录 → 调用 Claude Agent → 更新结果
     */
    public FaultRecord diagnose(DiagnosisRequest request) {
        // 持久化故障记录
        FaultRecord record = new FaultRecord();
        record.setDeviceId(request.getDeviceId());
        record.setDeviceName(request.getDeviceName());
        record.setDeviceType(request.getDeviceType());
        record.setSymptoms(String.join(",", request.getSymptoms()));
        record.setDescription(request.getDescription());
        record.setSeverity(request.getSeverity());
        record.setStatus("DIAGNOSING");
        record = recordRepository.save(record);

        try {
            String resultJson = runAgent(request);
            record.setDiagnosisResult(resultJson);
            record.setStatus("RESOLVED");
        } catch (Exception e) {
            String errorJson = toJson(Map.of(
                "error", "诊断失败：" + e.getMessage(),
                "fault_type", "未知",
                "confidence", "LOW",
                "root_causes", List.of("Agent调用失败，请检查API配置"),
                "troubleshooting_steps", List.of(Map.of("step", 1, "action", "检查API密钥配置", "detail", "在application.properties中设置claude.api.key"))
            ));
            record.setDiagnosisResult(errorJson);
            record.setStatus("OPEN");
        }
        return recordRepository.save(record);
    }

    // ===== Claude Agent 工具调用循环 =====

    private String runAgent(DiagnosisRequest request) throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            return runLocalDiagnosis(request);
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(buildUserMessage(request));

        for (int round = 0; round < MAX_AGENT_ROUNDS; round++) {
            Map<String, Object> response = callClaudeApi(messages);
            String stopReason = (String) response.get("stop_reason");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");

            // 将 assistant 消息加入历史
            messages.add(Map.of("role", "assistant", "content", content));

            if ("end_turn".equals(stopReason)) {
                // 提取最终文本回复
                String text = extractText(content);
                return extractJsonFromText(text);
            }

            if ("tool_use".equals(stopReason)) {
                // 执行所有工具调用
                List<Map<String, Object>> toolResults = new ArrayList<>();
                for (Map<String, Object> block : content) {
                    if ("tool_use".equals(block.get("type"))) {
                        String toolId = (String) block.get("id");
                        String toolName = (String) block.get("name");
                        @SuppressWarnings("unchecked")
                        Map<String, Object> input = (Map<String, Object>) block.get("input");
                        String result = executeTool(toolName, input);
                        toolResults.add(Map.of(
                            "type", "tool_result",
                            "tool_use_id", toolId,
                            "content", result
                        ));
                    }
                }
                messages.add(Map.of("role", "user", "content", toolResults));
            }
        }
        return runLocalDiagnosis(request);
    }

    private String executeTool(String toolName, Map<String, Object> input) {
        try {
            return switch (toolName) {
                case "search_fault_types" -> {
                    @SuppressWarnings("unchecked")
                    List<String> symptoms = (List<String>) input.getOrDefault("symptoms", List.of());
                    String deviceType = (String) input.getOrDefault("device_type", "");
                    List<Map<String, Object>> results = knowledgeService.searchFaultTypes(symptoms, deviceType);
                    yield toJson(results);
                }
                case "get_fault_details" -> {
                    String faultId = (String) input.get("fault_type_id");
                    yield toJson(knowledgeService.getFaultDetails(faultId));
                }
                case "list_device_faults" -> {
                    String deviceType = (String) input.get("device_type");
                    yield toJson(knowledgeService.listDeviceFaults(deviceType));
                }
                default -> "{\"error\": \"未知工具: " + toolName + "\"}";
            };
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callClaudeApi(List<Map<String, Object>> messages) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", ANTHROPIC_VERSION);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", 4096);
        body.put("system", buildSystemPrompt());
        body.put("tools", buildToolDefinitions());
        body.put("messages", messages);

        HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);
        ResponseEntity<String> response = restTemplate.exchange(CLAUDE_API_URL, HttpMethod.POST, entity, String.class);

        return mapper.readValue(response.getBody(), new TypeReference<>() {});
    }

    private Map<String, Object> buildUserMessage(DiagnosisRequest req) {
        String userText = String.format(
            "请分析以下设备故障并给出详细排查方案：\n\n" +
            "- 设备名称：%s\n" +
            "- 设备类型：%s\n" +
            "- 故障严重程度：%s\n" +
            "- 症状描述：%s\n" +
            "- 补充说明：%s\n\n" +
            "请使用工具查询知识图谱获取相关故障信息，然后给出完整的诊断报告（JSON格式）。",
            nvl(req.getDeviceName()),
            nvl(req.getDeviceType()),
            nvl(req.getSeverity()),
            req.getSymptoms() != null ? String.join("、", req.getSymptoms()) : "未描述",
            nvl(req.getDescription())
        );
        return Map.of("role", "user", "content", userText);
    }

    private String buildSystemPrompt() {
        return """
            你是工业设备故障诊断专家，基于故障本体知识图谱对设备故障进行专业分析。

            你的任务：
            1. 使用提供的工具查询故障知识图谱，获取与用户描述症状匹配的故障类型
            2. 深入分析每种可能故障的原因和解决方案
            3. 综合判断最可能的故障类型，给出置信度
            4. 输出结构化的诊断报告

            最终回复必须是以下格式的 JSON（不要包含其他文字，只输出 JSON）：
            {
              "fault_type": "最可能的故障类型名称",
              "fault_type_id": "故障类型ID",
              "confidence": "HIGH/MEDIUM/LOW",
              "summary": "故障概述（1-2句话）",
              "root_causes": ["根本原因1", "根本原因2"],
              "troubleshooting_steps": [
                {"step": 1, "action": "操作名称", "detail": "详细操作说明", "tool": "所需工具"},
                {"step": 2, "action": "操作名称", "detail": "详细操作说明", "tool": "所需工具"}
              ],
              "estimated_time": "预计处理时间",
              "required_tools": ["工具1", "工具2"],
              "urgency": "HIGH/MEDIUM/LOW",
              "prevention_tips": ["预防措施1", "预防措施2"],
              "alternative_faults": ["其他可能故障类型"]
            }
            """;
    }

    private List<Map<String, Object>> buildToolDefinitions() {
        return List.of(
            Map.of(
                "name", "search_fault_types",
                "description", "根据症状关键词和设备类型搜索匹配的故障类型列表",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "symptoms", Map.of("type", "array", "items", Map.of("type", "string"), "description", "症状关键词列表"),
                        "device_type", Map.of("type", "string", "description", "设备类型名称")
                    ),
                    "required", List.of("symptoms")
                )
            ),
            Map.of(
                "name", "get_fault_details",
                "description", "获取指定故障类型的详细信息，包括症状、原因和解决方案",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "fault_type_id", Map.of("type", "string", "description", "故障类型ID，如 ft_power、ft_overheat 等")
                    ),
                    "required", List.of("fault_type_id")
                )
            ),
            Map.of(
                "name", "list_device_faults",
                "description", "列出指定设备类型的常见故障类型",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "device_type", Map.of("type", "string", "description", "设备类型名称")
                    ),
                    "required", List.of("device_type")
                )
            )
        );
    }

    private String extractText(List<Map<String, Object>> content) {
        return content.stream()
            .filter(b -> "text".equals(b.get("type")))
            .map(b -> (String) b.get("text"))
            .findFirst()
            .orElse("{}");
    }

    private String extractJsonFromText(String text) {
        if (text == null) return "{}";
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    // ===== 本地降级诊断（无 API Key 时使用） =====

    private String runLocalDiagnosis(DiagnosisRequest request) {
        List<Map<String, Object>> candidates = knowledgeService.searchFaultTypes(
            request.getSymptoms(), request.getDeviceType());

        if (candidates.isEmpty()) {
            candidates = knowledgeService.allFaultTypes();
        }

        Map<String, Object> topFault = candidates.get(0);
        String faultId = (String) topFault.get("id");
        Map<String, Object> details = knowledgeService.getFaultDetails(faultId);

        @SuppressWarnings("unchecked")
        Map<String, Object> faultProps = (Map<String, Object>) topFault.get("properties");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> causes = (List<Map<String, Object>>) details.get("causes");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> solutions = (List<Map<String, Object>>) details.get("solutions");

        List<String> rootCauses = new ArrayList<>();
        if (causes != null) {
            for (Map<String, Object> cause : causes) {
                @SuppressWarnings("unchecked")
                Map<String, Object> p = (Map<String, Object>) cause.get("properties");
                if (p != null) rootCauses.add((String) p.get("name"));
            }
        }

        List<Map<String, Object>> steps = new ArrayList<>();
        List<String> tools = new ArrayList<>();
        if (solutions != null && !solutions.isEmpty()) {
            Map<String, Object> sol = solutions.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> sp = (Map<String, Object>) sol.get("properties");
            if (sp != null) {
                String stepsStr = (String) sp.getOrDefault("steps", "");
                String[] stepArr = stepsStr.split("；");
                for (int i = 0; i < stepArr.length; i++) {
                    steps.add(Map.of("step", i + 1, "action", "排查步骤" + (i + 1), "detail", stepArr[i].trim(), "tool", ""));
                }
                String reqTools = (String) sp.getOrDefault("requiredTools", "");
                tools = Arrays.asList(reqTools.split(","));
            }
        }

        List<String> altFaults = new ArrayList<>();
        for (int i = 1; i < Math.min(candidates.size(), 3); i++) {
            @SuppressWarnings("unchecked")
            Map<String, Object> p = (Map<String, Object>) candidates.get(i).get("properties");
            if (p != null) altFaults.add((String) p.get("name"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fault_type", faultProps.getOrDefault("name", "未知故障"));
        result.put("fault_type_id", faultId);
        result.put("confidence", candidates.size() == 1 ? "HIGH" : "MEDIUM");
        result.put("summary", "基于知识图谱分析，最可能的故障类型为：" + faultProps.getOrDefault("name", "未知"));
        result.put("root_causes", rootCauses);
        result.put("troubleshooting_steps", steps);
        String estimatedTime = "未知";
        if (solutions != null && !solutions.isEmpty()) {
            Object solProps = solutions.get(0).get("properties");
            if (solProps instanceof Map<?, ?> sp) {
                Object et = sp.get("estimatedTime");
                if (et != null) estimatedTime = et.toString();
            }
        }
        result.put("estimated_time", estimatedTime);
        result.put("required_tools", tools);
        result.put("urgency", faultProps.getOrDefault("severity", "MEDIUM"));
        result.put("prevention_tips", List.of("定期巡检设备", "保持工作环境清洁", "记录设备运行参数基线"));
        result.put("alternative_faults", altFaults);
        result.put("note", "当前为本地知识图谱诊断模式（未配置Claude API Key），如需AI深度分析请配置 claude.api.key");

        return toJson(result);
    }

    private String toJson(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String nvl(String s) {
        return s == null ? "未知" : s;
    }
}
