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
 * 支持实体类型：Equipment / Phenomenon / SubPhenomenon / Checkpoint /
 *              Cause / Solution / Component / Parameter
 * 支持关系类型：prone_to / contains / needs_check / discovers /
 *              located_at / caused_by / solved_by / supports
 */
@Service
public class FaultKnowledgeService {

    private final ObjectMapper mapper = new ObjectMapper();

    /** key=id, value=node map (含 entity/label/properties) */
    private final Map<String, Map<String, Object>> nodes = new LinkedHashMap<>();

    /** 关系列表，每条：{from, to, relation, properties} */
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
                    String type = (String) record.get("type");

                    if ("node".equals(type)) {
                        nodes.put((String) record.get("id"), record);
                    } else if ("relation".equals(type)) {
                        Map<String, Object> rel = new LinkedHashMap<>();
                        rel.put("from",       record.get("from"));
                        rel.put("to",         record.get("to"));
                        rel.put("relation",   record.get("relation"));
                        rel.put("properties", record.getOrDefault("properties", Map.of()));
                        relations.add(rel);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("无法加载故障本体知识图谱", e);
        }
    }

    // ===================================================================
    // 前端下拉 / 展示接口
    // ===================================================================

    /** 返回所有现象级问题（Phenomenon），供前端下拉选择 */
    public List<Map<String, Object>> allPhenomena() {
        return nodesByEntity("Phenomenon");
    }

    /** 返回所有子现象（SubPhenomenon），供前端展示 */
    public List<Map<String, Object>> allSubPhenomena() {
        return nodesByEntity("SubPhenomenon");
    }

    /** 获取某现象的所有子现象（contains 关系） */
    public List<Map<String, Object>> getSubPhenomena(String phenId) {
        return relatedNodes(phenId, "contains", "SubPhenomenon");
    }

    /** 获取现象或子现象的所有排查点（needs_check），按 priority 升序 */
    public List<Map<String, Object>> getCheckpoints(String nodeId) {
        return relations.stream()
            .filter(r -> nodeId.equals(r.get("from")) && "needs_check".equals(r.get("relation")))
            .sorted(Comparator.comparingInt(r -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> p = (Map<String, Object>) r.get("properties");
                Object pri = p != null ? p.get("priority") : null;
                return pri instanceof Number n ? n.intValue() : 99;
            }))
            .map(r -> {
                Map<String, Object> cp = nodes.get((String) r.get("to"));
                if (cp == null) return null;
                // 附加 priority 到结果
                Map<String, Object> result = new LinkedHashMap<>(cp);
                @SuppressWarnings("unchecked")
                Map<String, Object> relProps = (Map<String, Object>) r.get("properties");
                result.put("priority", relProps != null ? relProps.getOrDefault("priority", 99) : 99);
                return result;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /** 获取子现象的原因和解决方案 */
    public Map<String, Object> getCausesAndSolutions(String subPhenId) {
        List<Map<String, Object>> causes = relatedNodes(subPhenId, "caused_by", "Cause");
        List<Map<String, Object>> solutions = relatedNodes(subPhenId, "solved_by", "Solution");

        // 通过 cause → solved_by 补充解决方案
        for (Map<String, Object> cause : causes) {
            String causeId = (String) cause.get("id");
            List<Map<String, Object>> causeSols = relatedNodes(causeId, "solved_by", "Solution");
            for (Map<String, Object> sol : causeSols) {
                String solId = (String) sol.get("id");
                if (solutions.stream().noneMatch(s -> solId.equals(s.get("id")))) {
                    solutions.add(sol);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("causes",    causes);
        result.put("solutions", solutions);
        return result;
    }

    /** 获取排查点关联的参数采集配置（supports 关系，反向查询） */
    public List<Map<String, Object>> getParameterConfig(String checkpointId) {
        return relations.stream()
            .filter(r -> checkpointId.equals(r.get("to")) && "supports".equals(r.get("relation")))
            .map(r -> nodes.get((String) r.get("from")))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /** 搜索现象（Phenomenon + SubPhenomenon），支持关键词模糊匹配 */
    public List<Map<String, Object>> searchPhenomena(String query) {
        if (query == null || query.isBlank()) return allPhenomena();
        String q = query.trim().toLowerCase();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, Object> node : nodes.values()) {
            String entity = (String) node.get("entity");
            if (!"Phenomenon".equals(entity) && !"SubPhenomenon".equals(entity)) continue;
            String label = String.valueOf(node.getOrDefault("label", "")).toLowerCase();
            @SuppressWarnings("unchecked")
            Map<String, Object> props = (Map<String, Object>) node.get("properties");
            String desc = props != null ? String.valueOf(props.getOrDefault("description", "")).toLowerCase() : "";
            if (label.contains(q) || desc.contains(q)) results.add(node);
        }
        return results;
    }

    /** 根据设备（Equipment）查询其易发现象（prone_to） */
    public List<Map<String, Object>> listEquipmentFaults(String equipmentLabel) {
        return nodes.values().stream()
            .filter(n -> "Equipment".equals(n.get("entity")))
            .filter(n -> {
                String label = String.valueOf(n.getOrDefault("label", "")).toLowerCase();
                return label.contains(equipmentLabel.toLowerCase());
            })
            .flatMap(equip -> {
                String equipId = (String) equip.get("id");
                return relations.stream()
                    .filter(r -> equipId.equals(r.get("from")) && "prone_to".equals(r.get("relation")))
                    .map(r -> nodes.get((String) r.get("to")))
                    .filter(Objects::nonNull);
            })
            .collect(Collectors.toList());
    }

    /** 获取现象的完整诊断路径：Phenomenon→SubPhenomenon（递归）→Checkpoint→Cause→Solution */
    public Map<String, Object> getPhenomenonDetail(String phenId) {
        Map<String, Object> phen = nodes.get(phenId);
        if (phen == null) return Map.of("error", "现象不存在: " + phenId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("phenomenon",   phen);
        result.put("checkpoints",  getCheckpoints(phenId));
        result.put("subPhenomena", buildSubPhenTree(phenId));
        return result;
    }

    /** 递归构建子现象树，收集所有层级的 Checkpoint/Cause/Solution */
    private List<Map<String, Object>> buildSubPhenTree(String nodeId) {
        List<Map<String, Object>> subPhens = getSubPhenomena(nodeId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> sp : subPhens) {
            String spId = (String) sp.get("id");
            Map<String, Object> spDetail = new LinkedHashMap<>(sp);
            spDetail.put("checkpoints",        getCheckpoints(spId));
            spDetail.put("causesAndSolutions", getCausesAndSolutions(spId));
            // 递归子子现象
            List<Map<String, Object>> children = buildSubPhenTree(spId);
            spDetail.put("children", children);
            // 若本层无直接原因，把子层的合并上来方便前端展示
            Object csObj = spDetail.get("causesAndSolutions");
            if (csObj instanceof Map<?, ?> cs
                    && cs.get("causes") instanceof List<?> causeList
                    && causeList.isEmpty()) {
                List<String> aggCauses = new ArrayList<>();
                List<Map<String, Object>> aggSols = new ArrayList<>();
                collectFromChildren(children, aggCauses, aggSols);
                if (!aggCauses.isEmpty()) {
                    Map<String, Object> agg = new LinkedHashMap<>();
                    agg.put("causes",    aggCauses);
                    agg.put("solutions", aggSols);
                    spDetail.put("causesAndSolutions", agg);
                }
            }
            result.add(spDetail);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private void collectFromChildren(List<Map<String, Object>> children,
                                     List<String> causes, List<Map<String, Object>> sols) {
        for (Map<String, Object> child : children) {
            Object cs = child.get("causesAndSolutions");
            if (cs instanceof Map<?, ?> csMap) {
                Object cl = csMap.get("causes");
                if (cl instanceof List<?> cList) {
                    for (Object c : cList) {
                        if (c instanceof Map<?, ?> cm) {
                            Object lv = cm.get("label");
                            String label = lv != null ? lv.toString() : "";
                            if (!label.isEmpty() && !causes.contains(label)) causes.add(label);
                        }
                    }
                }
                Object sl = csMap.get("solutions");
                if (sl instanceof List<?> sList) {
                    for (Object s : sList) {
                        Map<String, Object> sMap = (Map<String, Object>) s;
                        String id = (String) sMap.get("id");
                        if (sols.stream().noneMatch(x -> id.equals(x.get("id")))) sols.add(sMap);
                    }
                }
            }
            List<Map<String, Object>> grandChildren = (List<Map<String, Object>>) child.getOrDefault("children", List.of());
            collectFromChildren(grandChildren, causes, sols);
        }
    }

    /** 返回完整图谱数据（节点 + 边），供可视化使用 */
    public Map<String, Object> graphData() {
        List<Map<String, Object>> nodeList = new ArrayList<>();
        List<Map<String, Object>> linkList = new ArrayList<>();

        for (Map<String, Object> node : nodes.values()) {
            Map<String, Object> n = new LinkedHashMap<>();
            n.put("id",     node.get("id"));
            n.put("type",   node.get("entity"));   // 前端 NODE_CONFIG 按 entity 类型着色
            n.put("label",  node.get("label"));
            n.put("props",  node.getOrDefault("properties", Map.of()));
            nodeList.add(n);
        }

        for (Map<String, Object> rel : relations) {
            Map<String, Object> link = new LinkedHashMap<>();
            link.put("source", rel.get("from"));
            link.put("target", rel.get("to"));
            link.put("rel",    rel.get("relation"));
            linkList.add(link);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("nodes", nodeList);
        result.put("links", linkList);
        return result;
    }

    // ===================================================================
    // Agent 诊断接口（供 FaultDiagnosisService 使用）
    // ===================================================================

    /** 为 Agent 提供：按症状关键词搜索现象（兼容旧接口） */
    public List<Map<String, Object>> searchBySymptoms(List<String> symptoms, String deviceType) {
        Set<String> found = new LinkedHashSet<>();

        // 先按设备类型找关联现象
        if (deviceType != null && !deviceType.isBlank()) {
            found.addAll(listEquipmentFaultIds(deviceType));
        }

        // 按症状关键词在 Phenomenon / SubPhenomenon 中搜索
        if (symptoms != null) {
            for (String sym : symptoms) {
                searchPhenomena(sym).stream()
                    .map(n -> (String) n.get("id"))
                    .forEach(found::add);
            }
        }

        if (found.isEmpty()) return allPhenomena();
        return found.stream().map(nodes::get).filter(Objects::nonNull).collect(Collectors.toList());
    }

    // ===================================================================
    // 内部辅助
    // ===================================================================

    private List<Map<String, Object>> nodesByEntity(String entity) {
        return nodes.values().stream()
            .filter(n -> entity.equals(n.get("entity")))
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> relatedNodes(String fromId, String relType, String entityFilter) {
        return relations.stream()
            .filter(r -> fromId.equals(r.get("from")) && relType.equals(r.get("relation")))
            .map(r -> nodes.get((String) r.get("to")))
            .filter(Objects::nonNull)
            .filter(n -> entityFilter == null || entityFilter.equals(n.get("entity")))
            .collect(Collectors.toList());
    }

    private List<String> listEquipmentFaultIds(String deviceType) {
        return nodes.values().stream()
            .filter(n -> "Equipment".equals(n.get("entity")))
            .filter(n -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> p = (Map<String, Object>) n.get("properties");
                String label = String.valueOf(n.getOrDefault("label", "")).toLowerCase();
                String desc  = p != null ? String.valueOf(p.getOrDefault("description", "")).toLowerCase() : "";
                String dt    = deviceType.toLowerCase();
                return label.contains(dt) || desc.contains(dt);
            })
            .flatMap(equip -> {
                String equipId = (String) equip.get("id");
                return relations.stream()
                    .filter(r -> equipId.equals(r.get("from")) && "prone_to".equals(r.get("relation")))
                    .map(r -> (String) r.get("to"));
            })
            .collect(Collectors.toList());
    }
}