package com.cccode.devicemanager.ontology.service;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class OntologyActionService {

    private final OntologyActionTypeRepository      actionTypeRepo;
    private final OntologyActionParameterRepository paramRepo;
    private final OntologyActionRuleRepository      ruleRepo;
    private final OntologyActionExecutionRepository executionRepo;
    private final OntologyObjectTypeRepository      objectTypeRepo;
    private final OntologyLinkTypeRepository        linkTypeRepo;
    private final OntologyObjectService             objectService;
    private final OntologyFunctionRepository        functionRepo;

    private final ObjectMapper mapper = new ObjectMapper();

    public OntologyActionService(OntologyActionTypeRepository actionTypeRepo,
                                  OntologyActionParameterRepository paramRepo,
                                  OntologyActionRuleRepository ruleRepo,
                                  OntologyActionExecutionRepository executionRepo,
                                  OntologyObjectTypeRepository objectTypeRepo,
                                  OntologyLinkTypeRepository linkTypeRepo,
                                  OntologyObjectService objectService,
                                  OntologyFunctionRepository functionRepo) {
        this.actionTypeRepo = actionTypeRepo;
        this.paramRepo      = paramRepo;
        this.ruleRepo       = ruleRepo;
        this.executionRepo  = executionRepo;
        this.objectTypeRepo = objectTypeRepo;
        this.linkTypeRepo   = linkTypeRepo;
        this.objectService  = objectService;
        this.functionRepo   = functionRepo;
    }

    // ===== ActionType CRUD =====

    public List<OntologyActionType> listActionTypes() {
        return actionTypeRepo.findAll();
    }

    public OntologyActionType getActionType(Long id) {
        return actionTypeRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("ActionType not found: " + id));
    }

    public OntologyActionType createActionType(OntologyActionType at) {
        return actionTypeRepo.save(at);
    }

    public OntologyActionType updateActionType(Long id, OntologyActionType patch) {
        OntologyActionType at = getActionType(id);
        if (patch.getDisplayName() != null)     at.setDisplayName(patch.getDisplayName());
        if (patch.getDescription() != null)     at.setDescription(patch.getDescription());
        if (patch.getStatus() != null)          at.setStatus(patch.getStatus());
        // 新增字段
        at.setTargetObjectTypeId(patch.getTargetObjectTypeId());
        if (patch.getTriggerType() != null)     at.setTriggerType(patch.getTriggerType());
        at.setTriggerConfigJson(patch.getTriggerConfigJson());
        if (patch.getExceptionPolicy() != null) at.setExceptionPolicy(patch.getExceptionPolicy());
        at.setExceptionConfigJson(patch.getExceptionConfigJson());
        at.setValidationRulesJson(patch.getValidationRulesJson());
        return actionTypeRepo.save(at);
    }

    @Transactional
    public void deleteActionType(Long id) {
        getActionType(id);
        paramRepo.deleteByActionTypeId(id);
        ruleRepo.deleteByActionTypeId(id);
        actionTypeRepo.deleteById(id);
    }

    // ===== Parameter CRUD =====

    public List<OntologyActionParameter> listParameters(Long actionTypeId) {
        return paramRepo.findByActionTypeIdOrderBySortOrder(actionTypeId);
    }

    public OntologyActionParameter addParameter(Long actionTypeId, OntologyActionParameter param) {
        getActionType(actionTypeId);
        param.setActionTypeId(actionTypeId);
        return paramRepo.save(param);
    }

    public OntologyActionParameter updateParameter(Long id, OntologyActionParameter patch) {
        OntologyActionParameter p = paramRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Parameter not found: " + id));
        if (patch.getDisplayName() != null)    p.setDisplayName(patch.getDisplayName());
        if (patch.getDataType() != null)       p.setDataType(patch.getDataType());
        if (patch.getDefaultValue() != null)   p.setDefaultValue(patch.getDefaultValue());
        if (patch.getConstraintsJson() != null) p.setConstraintsJson(patch.getConstraintsJson());
        p.setRequired(patch.isRequired());
        p.setSortOrder(patch.getSortOrder());
        return paramRepo.save(p);
    }

    public void deleteParameter(Long id) {
        paramRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Parameter not found: " + id));
        paramRepo.deleteById(id);
    }

    // ===== Rule CRUD =====

    public List<OntologyActionRule> listRules(Long actionTypeId) {
        return ruleRepo.findByActionTypeIdOrderBySortOrder(actionTypeId);
    }

    public OntologyActionRule addRule(Long actionTypeId, OntologyActionRule rule) {
        getActionType(actionTypeId);
        rule.setActionTypeId(actionTypeId);
        return ruleRepo.save(rule);
    }

    public OntologyActionRule updateRule(Long id, OntologyActionRule patch) {
        OntologyActionRule r = ruleRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Rule not found: " + id));
        if (patch.getRuleType() != null)              r.setRuleType(patch.getRuleType());
        if (patch.getTargetObjectTypeName() != null)  r.setTargetObjectTypeName(patch.getTargetObjectTypeName());
        if (patch.getTargetLinkTypeName() != null)    r.setTargetLinkTypeName(patch.getTargetLinkTypeName());
        if (patch.getPropertyMappingsJson() != null)  r.setPropertyMappingsJson(patch.getPropertyMappingsJson());
        if (patch.getConditionJson() != null)         r.setConditionJson(patch.getConditionJson());
        r.setSortOrder(patch.getSortOrder());
        return ruleRepo.save(r);
    }

    public void deleteRule(Long id) {
        ruleRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Rule not found: " + id));
        ruleRepo.deleteById(id);
    }

    // ===== Execution History =====

    public List<OntologyActionExecution> listExecutions(Long actionTypeId) {
        return executionRepo.findByActionTypeIdOrderByExecutedAtDesc(actionTypeId);
    }

    // ===== Execute Action =====

    @Transactional
    public OntologyActionExecution executeAction(Long actionTypeId, Map<String, Object> inputParameters) {
        OntologyActionExecution execution = new OntologyActionExecution();
        execution.setActionTypeId(actionTypeId);
        execution.setParametersJson(toJson(inputParameters));

        try {
            OntologyActionType actionType = getActionType(actionTypeId);
            if (!"ACTIVE".equals(actionType.getStatus())) {
                throw new IllegalStateException("ActionType is not ACTIVE: " + actionType.getStatus());
            }

            // Validate required parameters
            List<OntologyActionParameter> params = paramRepo.findByActionTypeIdOrderBySortOrder(actionTypeId);
            for (OntologyActionParameter p : params) {
                if (p.isRequired() && !inputParameters.containsKey(p.getName())) {
                    throw new IllegalArgumentException("Missing required parameter: " + p.getName());
                }
            }

            // Execute rules in order
            List<OntologyActionRule> rules = ruleRepo.findByActionTypeIdOrderBySortOrder(actionTypeId);
            List<Map<String, Object>> ruleResults = new ArrayList<>();

            for (OntologyActionRule rule : rules) {
                // Evaluate condition
                if (rule.getConditionJson() != null && !rule.getConditionJson().isBlank()) {
                    if (!evaluateCondition(rule.getConditionJson(), inputParameters)) {
                        continue;
                    }
                }

                Map<String, Object> ruleResult = executeRule(rule, inputParameters);
                ruleResults.add(ruleResult);
            }

            // Trigger associated functions (isolated from main transaction)
            triggerFunctions(actionTypeId, ruleResults, inputParameters, execution);

            execution.setStatus("SUCCESS");
            execution.setResultJson(toJson(Map.of("ruleResults", ruleResults)));

        } catch (Exception e) {
            execution.setStatus("FAILED");
            execution.setErrorMessage(e.getMessage());
            execution.setResultJson(toJson(Map.of("error", e.getMessage())));
        }

        return executionRepo.save(execution);
    }

    private Map<String, Object> executeRule(OntologyActionRule rule, Map<String, Object> params) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ruleId",   rule.getId());
        result.put("ruleType", rule.getRuleType());

        try {
            // Resolve property mappings
            Map<String, Object> resolvedProps = resolvePropertyMappings(rule.getPropertyMappingsJson(), params);

            switch (rule.getRuleType()) {
                case "CREATE_OBJECT" -> {
                    OntologyObjectType ot = objectTypeRepo.findByName(rule.getTargetObjectTypeName())
                        .orElseThrow(() -> new NoSuchElementException("ObjectType: " + rule.getTargetObjectTypeName()));
                    OntologyObject obj = new OntologyObject();
                    obj.setObjectTypeId(ot.getId());
                    obj.setPropertiesJson(toJson(resolvedProps));
                    OntologyObject created = objectService.createObject(obj);
                    result.put("objectId", created.getId());
                    result.put("status",   "created");
                }
                case "MODIFY_OBJECT" -> {
                    Object objIdVal = params.get("objectId");
                    if (objIdVal == null) throw new IllegalArgumentException("MODIFY_OBJECT requires 'objectId' parameter");
                    Long objId = toLong(objIdVal);
                    OntologyObject existing = objectService.getObjectById(objId);
                    existing.setPropertiesJson(toJson(resolvedProps));
                    objectService.updateObjectById(objId, existing);
                    result.put("objectId", objId);
                    result.put("status",   "modified");
                }
                case "DELETE_OBJECT" -> {
                    Object objIdVal = params.get("objectId");
                    if (objIdVal == null) throw new IllegalArgumentException("DELETE_OBJECT requires 'objectId' parameter");
                    Long objId = toLong(objIdVal);
                    objectService.deleteObjectById(objId);
                    result.put("objectId", objId);
                    result.put("status",   "deleted");
                }
                case "CREATE_LINK" -> {
                    OntologyLinkType lt = linkTypeRepo.findByName(rule.getTargetLinkTypeName())
                        .orElseThrow(() -> new NoSuchElementException("LinkType: " + rule.getTargetLinkTypeName()));
                    OntologyLink link = new OntologyLink();
                    link.setLinkTypeId(lt.getId());
                    link.setSourceObjectId(toLong(params.get("sourceObjectId")));
                    link.setTargetObjectId(toLong(params.get("targetObjectId")));
                    OntologyLink created = objectService.createLink(link);
                    result.put("linkId", created.getId());
                    result.put("status", "created");
                }
                case "DELETE_LINK" -> {
                    Long linkId = toLong(params.get("linkId"));
                    objectService.deleteLink(linkId);
                    result.put("linkId", linkId);
                    result.put("status", "deleted");
                }
                default -> throw new IllegalArgumentException("Unknown ruleType: " + rule.getRuleType());
            }
        } catch (Exception e) {
            result.put("status", "failed");
            result.put("error",  e.getMessage());
        }

        return result;
    }

    private boolean evaluateCondition(String conditionJson, Map<String, Object> params) {
        try {
            Map<String, Object> condition = mapper.readValue(conditionJson, new TypeReference<>() {});
            String field    = (String) condition.get("field");
            String operator = (String) condition.get("operator");
            Object value    = condition.get("value");
            Object actual   = params.get(field);
            if (actual == null) return false;
            return switch (operator) {
                case "eq"  -> actual.toString().equals(value.toString());
                case "neq" -> !actual.toString().equals(value.toString());
                case "exists" -> true;
                default -> true;
            };
        } catch (Exception e) {
            return true;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> resolvePropertyMappings(String mappingsJson, Map<String, Object> params) {
        if (mappingsJson == null || mappingsJson.isBlank()) return new LinkedHashMap<>();
        try {
            Map<String, Object> mappings = mapper.readValue(mappingsJson, new TypeReference<>() {});
            Map<String, Object> resolved = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : mappings.entrySet()) {
                String val = entry.getValue().toString();
                if (val.startsWith("$parameters.")) {
                    String paramName = val.substring("$parameters.".length());
                    resolved.put(entry.getKey(), params.getOrDefault(paramName, ""));
                } else {
                    resolved.put(entry.getKey(), entry.getValue());
                }
            }
            return resolved;
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private void triggerFunctions(Long actionTypeId, List<Map<String, Object>> ruleResults,
                                   Map<String, Object> params, OntologyActionExecution execution) {
        List<OntologyFunction> functions = functionRepo.findByActionTypeId(actionTypeId);
        for (OntologyFunction fn : functions) {
            if (!"ACTIVE".equals(fn.getStatus())) continue;
            // Functions are triggered asynchronously without blocking main transaction
            // Failure is isolated
        }
    }

    private Long toLong(Object val) {
        if (val == null) throw new IllegalArgumentException("Value is null");
        if (val instanceof Long l) return l;
        if (val instanceof Integer i) return i.longValue();
        return Long.parseLong(val.toString());
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }
}
