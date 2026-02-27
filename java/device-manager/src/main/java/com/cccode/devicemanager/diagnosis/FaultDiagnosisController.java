package com.cccode.devicemanager.diagnosis;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diagnosis")
public class FaultDiagnosisController {

    private final FaultDiagnosisService diagnosisService;
    private final FaultKnowledgeService knowledgeService;
    private final FaultRecordRepository recordRepository;

    public FaultDiagnosisController(FaultDiagnosisService diagnosisService,
                                    FaultKnowledgeService knowledgeService,
                                    FaultRecordRepository recordRepository) {
        this.diagnosisService = diagnosisService;
        this.knowledgeService = knowledgeService;
        this.recordRepository = recordRepository;
    }

    /** 提交故障诊断请求，触发 Agent 分析 */
    @PostMapping("/analyze")
    public ResponseEntity<FaultRecord> analyze(@RequestBody DiagnosisRequest request) {
        FaultRecord result = diagnosisService.diagnose(request);
        return ResponseEntity.ok(result);
    }

    /** 查询所有故障记录 */
    @GetMapping("/records")
    public List<FaultRecord> getAllRecords() {
        return recordRepository.findAllByOrderByReportedAtDesc();
    }

    /** 查询指定设备的故障记录 */
    @GetMapping("/records/device/{deviceId}")
    public List<FaultRecord> getByDevice(@PathVariable Long deviceId) {
        return recordRepository.findByDeviceIdOrderByReportedAtDesc(deviceId);
    }

    /** 获取单条故障记录 */
    @GetMapping("/records/{id}")
    public ResponseEntity<FaultRecord> getRecord(@PathVariable Long id) {
        return recordRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /** 删除故障记录 */
    @DeleteMapping("/records/{id}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Long id) {
        if (!recordRepository.existsById(id)) return ResponseEntity.notFound().build();
        recordRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** 获取所有现象级问题（供前端下拉选择） */
    @GetMapping("/phenomena")
    public List<Map<String, Object>> getPhenomena() {
        return knowledgeService.allPhenomena();
    }

    /** 搜索现象（支持关键词） */
    @GetMapping("/phenomena/search")
    public List<Map<String, Object>> searchPhenomena(@RequestParam String q) {
        return knowledgeService.searchPhenomena(q);
    }

    /** 获取现象的完整诊断路径（子现象 + 排查点 + 原因 + 解决方案） */
    @GetMapping("/phenomena/{id}/detail")
    public Map<String, Object> getPhenomenonDetail(@PathVariable String id) {
        return knowledgeService.getPhenomenonDetail(id);
    }

    /** 获取现象/子现象的排查点 */
    @GetMapping("/checkpoints")
    public List<Map<String, Object>> getCheckpoints(@RequestParam String nodeId) {
        return knowledgeService.getCheckpoints(nodeId);
    }

    /** 获取子现象的原因和解决方案 */
    @GetMapping("/causes-solutions")
    public Map<String, Object> getCausesAndSolutions(@RequestParam String subPhenId) {
        return knowledgeService.getCausesAndSolutions(subPhenId);
    }

    /** 返回完整知识图谱数据（节点 + 边），供前端可视化 */
    @GetMapping("/graph")
    public Map<String, Object> getGraphData() {
        return knowledgeService.graphData();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleError(Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
    }
}
