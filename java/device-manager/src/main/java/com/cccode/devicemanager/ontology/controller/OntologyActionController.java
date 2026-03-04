package com.cccode.devicemanager.ontology.controller;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.service.OntologyActionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ontology")
public class OntologyActionController {

    private final OntologyActionService actionService;

    public OntologyActionController(OntologyActionService actionService) {
        this.actionService = actionService;
    }

    // ===== ActionType =====

    @GetMapping("/action-types")
    public List<OntologyActionType> listActionTypes() {
        return actionService.listActionTypes();
    }

    @PostMapping("/action-types")
    public OntologyActionType createActionType(@RequestBody OntologyActionType at) {
        return actionService.createActionType(at);
    }

    @GetMapping("/action-types/{id}")
    public OntologyActionType getActionType(@PathVariable Long id) {
        return actionService.getActionType(id);
    }

    @PutMapping("/action-types/{id}")
    public OntologyActionType updateActionType(@PathVariable Long id, @RequestBody OntologyActionType patch) {
        return actionService.updateActionType(id, patch);
    }

    @DeleteMapping("/action-types/{id}")
    public ResponseEntity<Void> deleteActionType(@PathVariable Long id) {
        actionService.deleteActionType(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Parameters =====

    @GetMapping("/action-types/{id}/parameters")
    public List<OntologyActionParameter> listParameters(@PathVariable Long id) {
        return actionService.listParameters(id);
    }

    @PostMapping("/action-types/{id}/parameters")
    public OntologyActionParameter addParameter(@PathVariable Long id, @RequestBody OntologyActionParameter param) {
        return actionService.addParameter(id, param);
    }

    @PutMapping("/parameters/{id}")
    public OntologyActionParameter updateParameter(@PathVariable Long id, @RequestBody OntologyActionParameter patch) {
        return actionService.updateParameter(id, patch);
    }

    @DeleteMapping("/parameters/{id}")
    public ResponseEntity<Void> deleteParameter(@PathVariable Long id) {
        actionService.deleteParameter(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Rules =====

    @GetMapping("/action-types/{id}/rules")
    public List<OntologyActionRule> listRules(@PathVariable Long id) {
        return actionService.listRules(id);
    }

    @PostMapping("/action-types/{id}/rules")
    public OntologyActionRule addRule(@PathVariable Long id, @RequestBody OntologyActionRule rule) {
        return actionService.addRule(id, rule);
    }

    @PutMapping("/rules/{id}")
    public OntologyActionRule updateRule(@PathVariable Long id, @RequestBody OntologyActionRule patch) {
        return actionService.updateRule(id, patch);
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        actionService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Execute =====

    @PostMapping("/action-types/{id}/execute")
    public OntologyActionExecution executeAction(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> parameters) {
        return actionService.executeAction(id, parameters);
    }

    @GetMapping("/action-types/{id}/executions")
    public List<OntologyActionExecution> listExecutions(@PathVariable Long id) {
        return actionService.listExecutions(id);
    }
}
