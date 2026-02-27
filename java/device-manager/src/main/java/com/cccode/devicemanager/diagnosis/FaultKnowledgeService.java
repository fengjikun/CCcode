package com.cccode.devicemanager.diagnosis;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 故障知识图谱服务 — 从 JSONL 文件加载本体并提供查询接口。
 */
@Service
public class FaultKnowledgeService {

    private final ObjectMapper mapper = new ObjectMapper();

    /** key=entityId, value=entity map */
    private final Map<String, Map<String, Object>> entities = new LinkedHashMap<>();

    /** 关系列表 */
    private final List<Map<String, Object>> relations = new ArrayList<>();

    @PostConstruct
    public void load() {
        try {
            ClassPathResource resource = new ClassPathResource("fault-ontology/graph.jsonl");
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;

                    Map<String, Object> record = mapper.readValue(line, new TypeReference<>() {});
                    String op = (String) record.get("op");

                    switch (op) {
                        case "create" -> {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> entity = (Map<String, Object>) record.get("entity");
                            entities.put((String) entity.get("id"), entity);
                        }
                        case "relate" -> {
                            Map<String, Object> rel = new LinkedHashMap<>();
                            rel.put("from", record.get("from"));
                            rel.put("rel", record.get("rel"));
                            rel.put("to", record.get("to"));
                            rel.put("properties", record.getOrDefault("properties", Map.of()));
                            relations.add(rel);
                        }
                        default -> { /* update/delete ignored for read-only ontology */ }
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("无法加载故障本体知识图谱", e);
        }
    }

    // ===== 对外查询 API =====

    /** 根据症状关键词和设备类型搜索匹配的故障类型 */
    public List<Map<String, Object>> searchFaultTypes(List<String> symptoms, String deviceType) {
        Set<String> candidateIds = new HashSet<>();

        // 1. 通过设备类型关联找出优先故障类型
        if (deviceType != null && !deviceType.isBlank()) {
            String dtId = findDeviceTypeId(deviceType);
            if (dtId != null) {
                relations.stream()
                    .filter(r -> r.get("from").equals(dtId) && "prone_to".equals(r.get("rel")))
                    .map(r -> (String) r.get("to"))
                    .forEach(candidateIds::add);
            }
        }

        // 2. 通过症状关键词匹配症状实体，再找关联故障
        if (symptoms != null && !symptoms.isEmpty()) {
            List<String> symptomIds = findSymptomIdsByKeywords(symptoms);
            for (String symId : symptomIds) {
                relations.stream()
                    .filter(r -> "has_symptom".equals(r.get("rel")) && r.get("to").equals(symId))
                    .map(r -> (String) r.get("from"))
                    .forEach(candidateIds::add);
            }
        }

        // 3. 若无匹配，返回所有故障类型
        if (candidateIds.isEmpty()) {
            return entities.values().stream()
                .filter(e -> "FaultType".equals(e.get("type")))
                .collect(Collectors.toList());
        }

        return candidateIds.stream()
            .map(entities::get)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /** 获取故障类型的详细信息：症状、原因、解决方案 */
    public Map<String, Object> getFaultDetails(String faultTypeId) {
        Map<String, Object> fault = entities.get(faultTypeId);
        if (fault == null) return Map.of("error", "故障类型不存在: " + faultTypeId);

        List<Map<String, Object>> symptoms = getRelated(faultTypeId, "has_symptom");
        List<Map<String, Object>> causes = getRelated(faultTypeId, "caused_by");
        List<Map<String, Object>> solutions = getRelated(faultTypeId, "resolved_by");

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("fault", fault);
        detail.put("symptoms", symptoms);
        detail.put("causes", causes);
        detail.put("solutions", solutions);
        return detail;
    }

    /** 列出指定设备类型的常见故障 */
    public List<Map<String, Object>> listDeviceFaults(String deviceType) {
        String dtId = findDeviceTypeId(deviceType);
        if (dtId == null) {
            // 模糊返回所有故障类型
            return entities.values().stream()
                .filter(e -> "FaultType".equals(e.get("type")))
                .collect(Collectors.toList());
        }
        return relations.stream()
            .filter(r -> r.get("from").equals(dtId) && "prone_to".equals(r.get("rel")))
            .map(r -> entities.get((String) r.get("to")))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /** 返回所有故障类型（供前端展示） */
    public List<Map<String, Object>> allFaultTypes() {
        return entities.values().stream()
            .filter(e -> "FaultType".equals(e.get("type")))
            .collect(Collectors.toList());
    }

    /** 返回所有症状（供前端选择） */
    public List<Map<String, Object>> allSymptoms() {
        return entities.values().stream()
            .filter(e -> "Symptom".equals(e.get("type")))
            .collect(Collectors.toList());
    }

    /** 返回完整图谱数据（节点 + 边），供可视化使用 */
    public Map<String, Object> graphData() {
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> links = new ArrayList<>();

        for (Map<String, Object> entity : entities.values()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> props = (Map<String, Object>) entity.get("properties");
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id",    entity.get("id"));
            node.put("type",  entity.get("type"));
            node.put("label", props != null ? String.valueOf(props.getOrDefault("name", entity.get("id"))) : entity.get("id"));
            node.put("props", props != null ? props : Map.of());
            nodes.add(node);
        }

        for (Map<String, Object> rel : relations) {
            Map<String, Object> link = new LinkedHashMap<>();
            link.put("source", rel.get("from"));
            link.put("target", rel.get("to"));
            link.put("rel",    rel.get("rel"));
            links.add(link);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("nodes", nodes);
        result.put("links", links);
        return result;
    }

    // ===== 内部辅助 =====

    private List<Map<String, Object>> getRelated(String fromId, String relType) {
        return relations.stream()
            .filter(r -> r.get("from").equals(fromId) && relType.equals(r.get("rel")))
            .map(r -> entities.get((String) r.get("to")))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    private List<String> findSymptomIdsByKeywords(List<String> keywords) {
        List<String> ids = new ArrayList<>();
        for (Map<String, Object> entity : entities.values()) {
            if (!"Symptom".equals(entity.get("type"))) continue;
            @SuppressWarnings("unchecked")
            Map<String, Object> props = (Map<String, Object>) entity.get("properties");
            String name = String.valueOf(props.getOrDefault("name", ""));
            String desc = String.valueOf(props.getOrDefault("description", ""));
            for (String kw : keywords) {
                if (name.contains(kw) || desc.contains(kw)) {
                    ids.add((String) entity.get("id"));
                    break;
                }
            }
        }
        return ids;
    }

    private String findDeviceTypeId(String deviceType) {
        for (Map<String, Object> entity : entities.values()) {
            if (!"DeviceType".equals(entity.get("type"))) continue;
            @SuppressWarnings("unchecked")
            Map<String, Object> props = (Map<String, Object>) entity.get("properties");
            String name = String.valueOf(props.getOrDefault("name", ""));
            if (name.contains(deviceType) || deviceType.contains(name)) {
                return (String) entity.get("id");
            }
        }
        return null;
    }
}
