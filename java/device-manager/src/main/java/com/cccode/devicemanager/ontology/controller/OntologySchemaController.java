package com.cccode.devicemanager.ontology.controller;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.service.OntologySchemaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ontology")
public class OntologySchemaController {

    private final OntologySchemaService schemaService;

    public OntologySchemaController(OntologySchemaService schemaService) {
        this.schemaService = schemaService;
    }

    // ===== ObjectType =====

    @GetMapping("/object-types")
    public List<OntologyObjectType> listObjectTypes() {
        return schemaService.listObjectTypes();
    }

    @PostMapping("/object-types")
    public OntologyObjectType createObjectType(@RequestBody OntologyObjectType ot) {
        return schemaService.createObjectType(ot);
    }

    @GetMapping("/object-types/{id}")
    public OntologyObjectType getObjectType(@PathVariable Long id) {
        return schemaService.getObjectType(id);
    }

    @PutMapping("/object-types/{id}")
    public OntologyObjectType updateObjectType(@PathVariable Long id, @RequestBody OntologyObjectType patch) {
        return schemaService.updateObjectType(id, patch);
    }

    @DeleteMapping("/object-types/{id}")
    public ResponseEntity<Void> deleteObjectType(@PathVariable Long id) {
        schemaService.deleteObjectType(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Property =====

    @GetMapping("/object-types/{id}/properties")
    public List<OntologyProperty> listProperties(@PathVariable Long id) {
        return schemaService.listProperties(id);
    }

    @PostMapping("/object-types/{id}/properties")
    public OntologyProperty addProperty(@PathVariable Long id, @RequestBody OntologyProperty prop) {
        return schemaService.addProperty(id, prop);
    }

    @PutMapping("/properties/{id}")
    public OntologyProperty updateProperty(@PathVariable Long id, @RequestBody OntologyProperty patch) {
        return schemaService.updateProperty(id, patch);
    }

    @DeleteMapping("/properties/{id}")
    public ResponseEntity<Void> deleteProperty(@PathVariable Long id) {
        schemaService.deleteProperty(id);
        return ResponseEntity.noContent().build();
    }

    // ===== LinkType =====

    @GetMapping("/link-types")
    public List<OntologyLinkType> listLinkTypes() {
        return schemaService.listLinkTypes();
    }

    @PostMapping("/link-types")
    public OntologyLinkType createLinkType(@RequestBody OntologyLinkType lt) {
        return schemaService.createLinkType(lt);
    }

    @GetMapping("/link-types/{id}")
    public OntologyLinkType getLinkType(@PathVariable Long id) {
        return schemaService.getLinkType(id);
    }

    @PutMapping("/link-types/{id}")
    public OntologyLinkType updateLinkType(@PathVariable Long id, @RequestBody OntologyLinkType patch) {
        return schemaService.updateLinkType(id, patch);
    }

    @DeleteMapping("/link-types/{id}")
    public ResponseEntity<Void> deleteLinkType(@PathVariable Long id) {
        schemaService.deleteLinkType(id);
        return ResponseEntity.noContent().build();
    }

    // ===== Schema Graph =====

    @GetMapping("/schema")
    public Map<String, Object> getSchemaGraph() {
        return schemaService.getSchemaGraph();
    }
}
