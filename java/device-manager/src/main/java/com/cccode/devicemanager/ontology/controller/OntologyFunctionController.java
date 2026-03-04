package com.cccode.devicemanager.ontology.controller;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.service.OntologyFunctionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ontology")
public class OntologyFunctionController {

    private final OntologyFunctionService functionService;

    public OntologyFunctionController(OntologyFunctionService functionService) {
        this.functionService = functionService;
    }

    // ===== Function CRUD =====

    @GetMapping("/functions")
    public List<OntologyFunction> listFunctions() {
        return functionService.listFunctions();
    }

    @PostMapping("/functions")
    public OntologyFunction createFunction(@RequestBody OntologyFunction fn) {
        return functionService.createFunction(fn);
    }

    @GetMapping("/functions/{id}")
    public OntologyFunction getFunction(@PathVariable Long id) {
        return functionService.getFunction(id);
    }

    @PutMapping("/functions/{id}")
    public OntologyFunction updateFunction(@PathVariable Long id, @RequestBody OntologyFunction patch) {
        return functionService.updateFunction(id, patch);
    }

    @DeleteMapping("/functions/{id}")
    public ResponseEntity<Void> deleteFunction(@PathVariable Long id) {
        functionService.deleteFunction(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Execute =====

    @PostMapping("/functions/{id}/execute")
    public OntologyFunctionLog executeFunction(@PathVariable Long id,
                                                @RequestBody(required = false) Map<String, Object> inputData) {
        return functionService.executeFunction(id, inputData != null ? inputData : Map.of());
    }

    // ===== Logs =====

    @GetMapping("/functions/{id}/logs")
    public List<OntologyFunctionLog> listLogs(@PathVariable Long id) {
        return functionService.listLogs(id);
    }
}
