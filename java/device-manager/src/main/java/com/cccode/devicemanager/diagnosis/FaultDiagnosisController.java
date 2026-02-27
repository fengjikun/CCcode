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

    /** 获取知识图谱中的所有症状（供前端多选） */
    @GetMapping("/symptoms")
    public List<Map<String, Object>> getSymptoms() {
        return knowledgeService.allSymptoms();
    }

    /** 获取知识图谱中的所有故障类型 */
    @GetMapping("/fault-types")
    public List<Map<String, Object>> getFaultTypes() {
        return knowledgeService.allFaultTypes();
    }

    /** 根据设备类型查询常见故障 */
    @GetMapping("/fault-types/by-device")
    public List<Map<String, Object>> getFaultsByDevice(@RequestParam String deviceType) {
        return knowledgeService.listDeviceFaults(deviceType);
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
