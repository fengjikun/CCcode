package com.cccode.devicemanager.diagnosis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 故障诊断 Agent — 使用 Claude API tool-use 循环，基于本体知识图谱给出完整排查方案。
 * <p>
 * 诊断流程：
 *   1. search_phenomena       — 搜索匹配的现象级问题
 *   2. get_sub_phenomena      — 获取子现象列表
 *   3. get_checkpoints        — 获取排查点（按优先级排序）
 *   4. get_causes_and_solutions — 获取原因和解决方案
 *   5. get_parameter_config   — 获取参数采集配置（可选）
 *   6. record_diagnosis       — 输出最终诊断结论
 */
@Service
public class FaultDiagnosisService {

    private static final String CLAUDE_API_URL   = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int    MAX_AGENT_ROUNDS  = 8;

    @Value("${claude.api.key:}")
    private String apiKey;

    @Value("${claude.model:claude-opus-4-6}")
    private String model;

    private final RestTemplate          restTemplate;
    private final FaultKnowledgeService knowledgeService;
    private final FaultRecordRepository recordRepository;
    private final ObjectMapper          mapper = new ObjectMapper();

    public FaultDiagnosisService(RestTemplate restTemplate,
                                 FaultKnowledgeService knowledgeService,
                                 FaultRecordRepository recordRepository) {
        this.restTemplate    = restTemplate;
        this.knowledgeService = knowledgeService;
        this.recordRepository = recordRepository;
    }

    /** 执行故障诊断：保存记录 → 调用 Agent → 更新结果 */
    public FaultRecord diagnose(DiagnosisRequest request) {
        FaultRecord record = new FaultRecord();
        record.setDeviceId(request.getDeviceId());
        record.setDeviceName(request.getDeviceName());
        record.setDeviceType(request.getDeviceType());
        record.setSymptoms(request.getPhenomenonId() != null
            ? request.getPhenomenonId()
            : (request.getSymptoms() != null ? String.join(",", request.getSymptoms()) : ""));
        record.setDescription(request.getDescription());
        record.setSeverity(request.getSeverity());
        record.setStatus("DIAGNOSING");
        record = recordRepository.save(record);

        try {
            String resultJson = runAgent(request);
            record.setDiagnosisResult(resultJson);
            record.setStatus("RESOLVED");
        } catch (Exception e) {
            record.setDiagnosisResult(toJson(Map.of(
                "error", "诊断失败：" + e.getMessage(),
                "phenomenon", "未知",
                "confidence", "LOW",
                "checkpoints", List.of(),
                "causes", List.of("Agent调用失败，请检查API配置"),
                "solutions", List.of()
            )));
            record.setStatus("OPEN");
        }
        return recordRepository.save(record);
    }

    // ===================================================================
    // Agent 工具调用循环
    // ===================================================================

    private String runAgent(DiagnosisRequest request) throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            return runLocalDiagnosis(request);
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(buildUserMessage(request));

        // 最终诊断结论暂存（由 record_diagnosis 工具填入）
        final String[] diagnosisConclusion = {null};

        for (int round = 0; round < MAX_AGENT_ROUNDS; round++) {
            Map<String, Object> response = callClaudeApi(messages);
            String stopReason = (String) response.get("stop_reason");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            messages.add(Map.of("role", "assistant", "content", content));

            if ("end_turn".equals(stopReason)) {
                // 如果已记录诊断结论，返回它
                if (diagnosisConclusion[0] != null) return diagnosisConclusion[0];
                // 否则从文本中提取
                return extractJsonFromText(extractText(content));
            }

            if ("tool_use".equals(stopReason)) {
                List<Map<String, Object>> toolResults = new ArrayList<>();
                for (Map<String, Object> block : content) {
                    if (!"tool_use".equals(block.get("type"))) continue;
                    String toolId   = (String) block.get("id");
                    String toolName = (String) block.get("name");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> input = (Map<String, Object>) block.get("input");

                    if ("record_diagnosis".equals(toolName)) {
                        diagnosisConclusion[0] = toJson(input);
                    }

                    String result = executeTool(toolName, input);
                    toolResults.add(Map.of(
                        "type",        "tool_result",
                        "tool_use_id", toolId,
                        "content",     result
                    ));
                }
                messages.add(Map.of("role", "user", "content", toolResults));

                // record_diagnosis 已调用，继续让模型 end_turn
                if (diagnosisConclusion[0] != null && round >= MAX_AGENT_ROUNDS - 2) {
                    return diagnosisConclusion[0];
                }
            }
        }
        return diagnosisConclusion[0] != null ? diagnosisConclusion[0] : runLocalDiagnosis(request);
    }

    private String executeTool(String toolName, Map<String, Object> input) {
        try {
            return switch (toolName) {
                case "search_phenomena" -> {
                    String query = (String) input.getOrDefault("query", "");
                    @SuppressWarnings("unchecked")
                    List<String> symptoms = (List<String>) input.getOrDefault("symptoms", List.of());
                    String deviceType = (String) input.getOrDefault("device_type", "");
                    if (!query.isBlank()) {
                        yield toJson(knowledgeService.searchPhenomena(query));
                    }
                    yield toJson(knowledgeService.searchBySymptoms(symptoms, deviceType));
                }
                case "get_sub_phenomena" -> {
                    String phenId = (String) input.get("phenomenon_id");
                    yield toJson(knowledgeService.getSubPhenomena(phenId));
                }
                case "get_checkpoints" -> {
                    String nodeId = (String) input.get("node_id");
                    yield toJson(knowledgeService.getCheckpoints(nodeId));
                }
                case "get_causes_and_solutions" -> {
                    String subPhenId = (String) input.get("sub_phenomenon_id");
                    yield toJson(knowledgeService.getCausesAndSolutions(subPhenId));
                }
                case "get_parameter_config" -> {
                    String cpId = (String) input.get("checkpoint_id");
                    yield toJson(knowledgeService.getParameterConfig(cpId));
                }
                case "record_diagnosis" -> {
                    // record_diagnosis 的内容由调用者捕获，工具返回确认
                    yield "{\"status\":\"recorded\"}";
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
        body.put("model",      model);
        body.put("max_tokens", 4096);
        body.put("system",     buildSystemPrompt());
        body.put("tools",      buildToolDefinitions());
        body.put("messages",   messages);

        HttpEntity<String> entity = new HttpEntity<>(mapper.writeValueAsString(body), headers);
        ResponseEntity<String> response = restTemplate.exchange(
            CLAUDE_API_URL, HttpMethod.POST, entity, String.class);
        return mapper.readValue(response.getBody(), new TypeReference<>() {});
    }

    private Map<String, Object> buildUserMessage(DiagnosisRequest req) {
        String symptoms = req.getSymptoms() != null ? String.join("、", req.getSymptoms()) : "未描述";
        String phenId   = req.getPhenomenonId() != null ? req.getPhenomenonId() : "";

        String userText = String.format(
            "请对以下设备故障进行诊断，给出完整的排查方案：\n\n" +
            "- 设备名称：%s\n" +
            "- 设备类型：%s\n" +
            "- 故障严重程度：%s\n" +
            "- 故障现象ID：%s\n" +
            "- 报告症状：%s\n" +
            "- 补充说明：%s\n\n" +
            "请按诊断流程：先搜索匹配现象，再获取子现象和排查点，然后获取原因与解决方案，最后用 record_diagnosis 记录结论。",
            nvl(req.getDeviceName()),
            nvl(req.getDeviceType()),
            nvl(req.getSeverity()),
            phenId.isBlank() ? "（未指定，请通过症状搜索）" : phenId,
            symptoms,
            nvl(req.getDescription())
        );
        return Map.of("role", "user", "content", userText);
    }

    private String buildSystemPrompt() {
        return """
            你是工业设备故障诊断专家，基于大族智控设备故障诊断本体知识图谱进行专业分析。

            本体结构：
            - Phenomenon（现象级问题）→ contains → SubPhenomenon（子现象）
            - Phenomenon/SubPhenomenon → needs_check → Checkpoint（排查点，按priority排序）
            - Checkpoint → discovers → SubPhenomenon（发现某子现象）
            - SubPhenomenon → caused_by → Cause（原因）
            - Cause/SubPhenomenon → solved_by → Solution（解决方案）
            - Parameter → supports → Checkpoint（参数采集配置）

            诊断流程：
            1. 调用 search_phenomena 搜索与用户描述匹配的现象
            2. 调用 get_sub_phenomena 获取该现象的子现象
            3. 调用 get_checkpoints 获取排查点（priority小的优先执行）
            4. 根据排查点逐步分析，调用 get_causes_and_solutions 获取原因和解决方案
            5. 可选：调用 get_parameter_config 了解可自动采集的参数
            6. 最终调用 record_diagnosis 记录完整诊断结论

            重要：必须调用 record_diagnosis 工具记录诊断结论，参数格式：
            {
              "phenomenon": "现象名称",
              "phenomenon_id": "现象ID",
              "confidence": "HIGH/MEDIUM/LOW",
              "summary": "故障概述（1-2句话）",
              "matched_sub_phenomena": ["匹配的子现象"],
              "checkpoints": [
                {"step": 1, "checkpoint": "排查点名称", "checkpoint_id": "ID", "method": "操作方法", "expected": "预期结果", "priority": 1}
              ],
              "causes": ["原因1", "原因2"],
              "solutions": [
                {"title": "解决方案名称", "steps": "步骤（分号分隔）", "estimated_time": "预计时间", "risk_level": "风险等级"}
              ],
              "estimated_time": "总预计处理时间",
              "urgency": "HIGH/MEDIUM/LOW"
            }
            """;
    }

    private List<Map<String, Object>> buildToolDefinitions() {
        return List.of(
            Map.of(
                "name", "search_phenomena",
                "description", "搜索与用户描述的故障症状匹配的现象级问题（Phenomenon）",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "query",       Map.of("type", "string",  "description", "故障描述关键词，如'W轴限位报警'"),
                        "symptoms",    Map.of("type", "array", "items", Map.of("type", "string"), "description", "症状关键词列表"),
                        "device_type", Map.of("type", "string",  "description", "设备类型，如'激光切割机'")
                    ),
                    "required", List.of()
                )
            ),
            Map.of(
                "name", "get_sub_phenomena",
                "description", "获取某现象级问题（Phenomenon）的所有子现象（SubPhenomenon）",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "phenomenon_id", Map.of("type", "string", "description", "现象级问题的ID，如 phen_w_limit")
                    ),
                    "required", List.of("phenomenon_id")
                )
            ),
            Map.of(
                "name", "get_checkpoints",
                "description", "获取某现象或子现象的所有排查点（Checkpoint），按优先级排序",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "node_id", Map.of("type", "string", "description", "现象或子现象的ID")
                    ),
                    "required", List.of("node_id")
                )
            ),
            Map.of(
                "name", "get_causes_and_solutions",
                "description", "获取某子现象（SubPhenomenon）的可能原因（Cause）和解决方案（Solution）",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "sub_phenomenon_id", Map.of("type", "string", "description", "子现象的ID，如 sp_io_no_purple")
                    ),
                    "required", List.of("sub_phenomenon_id")
                )
            ),
            Map.of(
                "name", "get_parameter_config",
                "description", "获取某排查点（Checkpoint）关联的设备参数采集配置（Parameter）",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "checkpoint_id", Map.of("type", "string", "description", "排查点的ID")
                    ),
                    "required", List.of("checkpoint_id")
                )
            ),
            Map.of(
                "name", "record_diagnosis",
                "description", "记录最终诊断结论，包含排查步骤和解决方案",
                "input_schema", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "phenomenon",           Map.of("type", "string",  "description", "现象名称"),
                        "phenomenon_id",        Map.of("type", "string",  "description", "现象ID"),
                        "confidence",           Map.of("type", "string",  "description", "置信度：HIGH/MEDIUM/LOW"),
                        "summary",              Map.of("type", "string",  "description", "故障概述"),
                        "matched_sub_phenomena",Map.of("type", "array", "items", Map.of("type", "string"), "description", "匹配的子现象列表"),
                        "checkpoints",          Map.of("type", "array", "items", Map.of("type", "object"), "description", "排查步骤列表"),
                        "causes",               Map.of("type", "array", "items", Map.of("type", "string"), "description", "根本原因列表"),
                        "solutions",            Map.of("type", "array", "items", Map.of("type", "object"), "description", "解决方案列表"),
                        "estimated_time",       Map.of("type", "string",  "description", "预计处理时间"),
                        "urgency",              Map.of("type", "string",  "description", "紧急程度：HIGH/MEDIUM/LOW")
                    ),
                    "required", List.of("phenomenon", "confidence", "checkpoints", "solutions")
                )
            )
        );
    }

    // ===================================================================
    // 本地降级诊断（无 API Key 时使用）
    // ===================================================================

    private String runLocalDiagnosis(DiagnosisRequest request) {
        // 1. 搜索匹配现象
        String phenId = request.getPhenomenonId();
        List<Map<String, Object>> candidates;
        if (phenId != null && !phenId.isBlank()) {
            candidates = List.of();
            Map<String, Object> detail = knowledgeService.getPhenomenonDetail(phenId);
            if (!detail.containsKey("error")) {
                return buildLocalResult(phenId, detail, request);
            }
        }

        candidates = knowledgeService.searchBySymptoms(
            request.getSymptoms(), request.getDeviceType());
        if (candidates.isEmpty()) {
            candidates = knowledgeService.allPhenomena();
        }
        if (candidates.isEmpty()) {
            return toJson(Map.of("error", "知识图谱中没有找到匹配的故障现象"));
        }

        Map<String, Object> topPhen = candidates.get(0);
        String topPhenId = (String) topPhen.get("id");
        Map<String, Object> detail = knowledgeService.getPhenomenonDetail(topPhenId);
        return buildLocalResult(topPhenId, detail, request);
    }

    @SuppressWarnings("unchecked")
    private String buildLocalResult(String phenId, Map<String, Object> detail, DiagnosisRequest request) {
        Map<String, Object> phen = (Map<String, Object>) detail.get("phenomenon");
        List<Map<String, Object>> checkpoints = (List<Map<String, Object>>) detail.getOrDefault("checkpoints", List.of());
        List<Map<String, Object>> subPhens    = (List<Map<String, Object>>) detail.getOrDefault("subPhenomena", List.of());

        // 构建排查步骤
        List<Map<String, Object>> cpSteps = new ArrayList<>();
        int step = 1;
        for (Map<String, Object> cp : checkpoints) {
            Map<String, Object> props = (Map<String, Object>) cp.get("properties");
            Map<String, Object> cpStep = new LinkedHashMap<>();
            cpStep.put("step",       step++);
            cpStep.put("checkpoint", cp.get("label"));
            cpStep.put("checkpoint_id", cp.get("id"));
            cpStep.put("method",     props != null ? props.getOrDefault("method",        "请参考设备手册") : "请参考设备手册");
            cpStep.put("expected",   props != null ? props.getOrDefault("expectedValue", "正常状态") : "正常状态");
            cpStep.put("priority",   cp.getOrDefault("priority", 99));
            cpSteps.add(cpStep);
        }

        // 收集所有原因和解决方案
        List<String> allCauses = new ArrayList<>();
        List<Map<String, Object>> allSolutions = new ArrayList<>();
        for (Map<String, Object> sp : subPhens) {
            String spId = (String) sp.get("id");
            Map<String, Object> cs = knowledgeService.getCausesAndSolutions(spId);
            List<Map<String, Object>> causes    = (List<Map<String, Object>>) cs.get("causes");
            List<Map<String, Object>> solutions = (List<Map<String, Object>>) cs.get("solutions");

            if (causes != null) {
                for (Map<String, Object> c : causes) {
                    String label = String.valueOf(c.getOrDefault("label", ""));
                    if (!allCauses.contains(label)) allCauses.add(label);
                }
            }
            if (solutions != null) {
                for (Map<String, Object> sol : solutions) {
                    String solId = (String) sol.get("id");
                    if (allSolutions.stream().noneMatch(s -> solId.equals(s.get("id")))) {
                        Map<String, Object> props = (Map<String, Object>) sol.get("properties");
                        Map<String, Object> s = new LinkedHashMap<>();
                        s.put("id",             solId);
                        s.put("title",          sol.get("label"));
                        s.put("steps",          props != null ? props.getOrDefault("steps",         "") : "");
                        s.put("estimated_time", props != null ? props.getOrDefault("estimatedTime", "未知") : "未知");
                        s.put("risk_level",     props != null ? props.getOrDefault("riskLevel",     "LOW") : "LOW");
                        allSolutions.add(s);
                    }
                }
            }
        }

        // 首选方案预计时间
        String estimatedTime = allSolutions.isEmpty() ? "未知"
            : String.valueOf(allSolutions.get(0).getOrDefault("estimated_time", "未知"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("phenomenon",    phen != null ? phen.get("label") : phenId);
        result.put("phenomenon_id", phenId);
        result.put("confidence",    "HIGH");
        result.put("summary",       "基于知识图谱分析：" + (phen != null ? phen.get("label") : phenId));
        result.put("matched_sub_phenomena", subPhens.stream().map(s -> s.get("label")).toList());
        result.put("checkpoints",   cpSteps);
        result.put("causes",        allCauses);
        result.put("solutions",     allSolutions);
        result.put("estimated_time", estimatedTime);
        result.put("urgency",       request.getSeverity() != null ? request.getSeverity() : "MEDIUM");
        result.put("note",          "当前为本地知识图谱诊断模式，如需AI深度分析请配置 claude.api.key");
        return toJson(result);
    }

    // ===================================================================
    // 工具方法
    // ===================================================================

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
        int end   = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : text;
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { return "{}"; }
    }

    private String nvl(String s) { return s == null ? "未知" : s; }
}