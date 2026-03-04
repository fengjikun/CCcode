package com.cccode.devicemanager.ontology.controller;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.service.OntologyObjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ontology")
public class OntologyObjectController {

    private final OntologyObjectService objectService;

    public OntologyObjectController(OntologyObjectService objectService) {
        this.objectService = objectService;
    }

    // ===== Object CRUD =====

    @GetMapping("/object-types/{typeId}/objects")
    public List<OntologyObject> listObjects(@PathVariable Long typeId) {
        return objectService.listObjects(typeId);
    }

    @PostMapping("/object-types/{typeId}/objects")
    public OntologyObject createObject(@PathVariable Long typeId, @RequestBody OntologyObject obj) {
        obj.setObjectTypeId(typeId);
        return objectService.createObject(obj);
    }

    @GetMapping("/object-types/{typeId}/objects/{id}")
    public OntologyObject getObject(@PathVariable Long typeId, @PathVariable Long id) {
        return objectService.getObject(typeId, id);
    }

    @PutMapping("/object-types/{typeId}/objects/{id}")
    public OntologyObject updateObject(@PathVariable Long typeId, @PathVariable Long id,
                                        @RequestBody OntologyObject patch) {
        return objectService.updateObject(typeId, id, patch);
    }

    @DeleteMapping("/object-types/{typeId}/objects/{id}")
    public ResponseEntity<Void> deleteObject(@PathVariable Long typeId, @PathVariable Long id) {
        objectService.deleteObject(typeId, id);
        return ResponseEntity.noContent().build();
    }

    // ===== Links =====

    @GetMapping("/object-types/{typeId}/objects/{id}/links")
    public List<Map<String, Object>> getObjectLinks(@PathVariable Long typeId, @PathVariable Long id) {
        return objectService.getObjectLinks(id);
    }

    @PostMapping("/links")
    public OntologyLink createLink(@RequestBody OntologyLink link) {
        return objectService.createLink(link);
    }

    @DeleteMapping("/links/{id}")
    public ResponseEntity<Void> deleteLink(@PathVariable Long id) {
        objectService.deleteLink(id);
        return ResponseEntity.noContent().build();
    }
}
