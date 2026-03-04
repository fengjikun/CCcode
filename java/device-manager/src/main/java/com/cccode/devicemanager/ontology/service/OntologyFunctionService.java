package com.cccode.devicemanager.ontology.service;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;

@Service
public class OntologyFunctionService {

    private final OntologyFunctionRepository    functionRepo;
    private final OntologyFunctionLogRepository logRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public OntologyFunctionService(OntologyFunctionRepository functionRepo,
                                    OntologyFunctionLogRepository logRepo) {
        this.functionRepo = functionRepo;
        this.logRepo      = logRepo;
    }

    // ===== Function CRUD =====

    public List<OntologyFunction> listFunctions() {
        return functionRepo.findAll();
    }

    public OntologyFunction getFunction(Long id) {
        return functionRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Function not found: " + id));
    }

    public OntologyFunction createFunction(OntologyFunction fn) {
        return functionRepo.save(fn);
    }

    public OntologyFunction updateFunction(Long id, OntologyFunction patch) {
        OntologyFunction fn = getFunction(id);
        if (patch.getDisplayName() != null)   fn.setDisplayName(patch.getDisplayName());
        if (patch.getDescription() != null)   fn.setDescription(patch.getDescription());
        if (patch.getScriptContent() != null) fn.setScriptContent(patch.getScriptContent());
        if (patch.getStatus() != null)        fn.setStatus(patch.getStatus());
        if (patch.getInputSchemaJson() != null)  fn.setInputSchemaJson(patch.getInputSchemaJson());
        if (patch.getOutputSchemaJson() != null) fn.setOutputSchemaJson(patch.getOutputSchemaJson());
        if (patch.getActionTypeId() != null)  fn.setActionTypeId(patch.getActionTypeId());
        return functionRepo.save(fn);
    }

    public void deleteFunction(Long id) {
        getFunction(id);
        functionRepo.deleteById(id);
    }

    // ===== Execute Function =====

    public OntologyFunctionLog executeFunction(Long id, Map<String, Object> inputData) {
        return executeFunction(id, inputData, null);
    }

    public OntologyFunctionLog executeFunction(Long id, Map<String, Object> inputData, Long actionExecutionId) {
        OntologyFunction fn = getFunction(id);
        OntologyFunctionLog log = new OntologyFunctionLog();
        log.setFunctionId(id);
        log.setActionExecutionId(actionExecutionId);
        log.setInputDataJson(toJson(inputData));

        long startMs = System.currentTimeMillis();

        try {
            Object result = runGroovyScript(fn.getScriptContent(), inputData);
            long duration = System.currentTimeMillis() - startMs;

            String outputJson;
            if (result instanceof Map) {
                outputJson = toJson(result);
            } else {
                outputJson = toJson(Map.of("result", result != null ? result.toString() : "null"));
            }

            log.setOutputDataJson(outputJson);
            log.setStatus("SUCCESS");
            log.setDurationMs(duration);

        } catch (TimeoutException e) {
            long duration = System.currentTimeMillis() - startMs;
            log.setStatus("TIMEOUT");
            log.setErrorMessage("Script execution timed out after 30 seconds");
            log.setDurationMs(duration);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startMs;
            log.setStatus("FAILED");
            log.setErrorMessage(e.getMessage());
            log.setDurationMs(duration);
        }

        return logRepo.save(log);
    }

    private Object runGroovyScript(String script, Map<String, Object> inputData) throws Exception {
        if (script == null || script.isBlank()) {
            throw new IllegalArgumentException("Script content is empty");
        }

        Callable<Object> task = () -> {
            Binding binding = new Binding();
            binding.setVariable("input",   inputData);
            binding.setVariable("context", Map.of("timestamp", System.currentTimeMillis()));

            // Expose individual input keys as top-level variables
            if (inputData != null) {
                for (Map.Entry<String, Object> entry : inputData.entrySet()) {
                    binding.setVariable(entry.getKey(), entry.getValue());
                }
            }

            GroovyShell shell = new GroovyShell(binding);
            return shell.evaluate(script);
        };

        Future<Object> future = executor.submit(task);
        try {
            return future.get(30, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw e;
        } catch (ExecutionException e) {
            throw new RuntimeException(e.getCause() != null ? e.getCause().getMessage() : e.getMessage(), e.getCause());
        }
    }

    // ===== Logs =====

    public List<OntologyFunctionLog> listLogs(Long functionId) {
        return logRepo.findByFunctionIdOrderByExecutedAtDesc(functionId);
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }
}
