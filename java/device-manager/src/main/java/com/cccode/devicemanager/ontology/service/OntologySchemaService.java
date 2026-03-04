package com.cccode.devicemanager.ontology.service;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class OntologySchemaService {

    private final OntologyObjectTypeRepository objectTypeRepo;
    private final OntologyPropertyRepository propertyRepo;
    private final OntologyLinkTypeRepository linkTypeRepo;

    public OntologySchemaService(OntologyObjectTypeRepository objectTypeRepo,
                                  OntologyPropertyRepository propertyRepo,
                                  OntologyLinkTypeRepository linkTypeRepo) {
        this.objectTypeRepo = objectTypeRepo;
        this.propertyRepo   = propertyRepo;
        this.linkTypeRepo   = linkTypeRepo;
    }

    // ===== ObjectType =====

    public List<OntologyObjectType> listObjectTypes() {
        return objectTypeRepo.findAll();
    }

    public OntologyObjectType getObjectType(Long id) {
        return objectTypeRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("ObjectType not found: " + id));
    }

    public OntologyObjectType createObjectType(OntologyObjectType ot) {
        if (objectTypeRepo.existsByName(ot.getName())) {
            throw new IllegalArgumentException("ObjectType name already exists: " + ot.getName());
        }
        return objectTypeRepo.save(ot);
    }

    public OntologyObjectType updateObjectType(Long id, OntologyObjectType patch) {
        OntologyObjectType ot = getObjectType(id);
        if (patch.getDisplayName() != null) ot.setDisplayName(patch.getDisplayName());
        if (patch.getDescription() != null) ot.setDescription(patch.getDescription());
        if (patch.getPrimaryKeyProperty() != null) ot.setPrimaryKeyProperty(patch.getPrimaryKeyProperty());
        if (patch.getIcon() != null) ot.setIcon(patch.getIcon());
        if (patch.getColor() != null) ot.setColor(patch.getColor());
        return objectTypeRepo.save(ot);
    }

    @Transactional
    public void deleteObjectType(Long id) {
        getObjectType(id);
        propertyRepo.deleteByObjectTypeId(id);
        objectTypeRepo.deleteById(id);
    }

    // ===== Property =====

    public List<OntologyProperty> listProperties(Long objectTypeId) {
        return propertyRepo.findByObjectTypeIdOrderBySortOrder(objectTypeId);
    }

    public OntologyProperty addProperty(Long objectTypeId, OntologyProperty prop) {
        getObjectType(objectTypeId); // validate parent exists
        prop.setObjectTypeId(objectTypeId);
        return propertyRepo.save(prop);
    }

    public OntologyProperty updateProperty(Long id, OntologyProperty patch) {
        OntologyProperty prop = propertyRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Property not found: " + id));
        if (patch.getDisplayName() != null) prop.setDisplayName(patch.getDisplayName());
        if (patch.getDataType() != null) prop.setDataType(patch.getDataType());
        if (patch.getDescription() != null) prop.setDescription(patch.getDescription());
        if (patch.getDefaultValue() != null) prop.setDefaultValue(patch.getDefaultValue());
        prop.setRequired(patch.isRequired());
        prop.setSortOrder(patch.getSortOrder());
        return propertyRepo.save(prop);
    }

    public void deleteProperty(Long id) {
        propertyRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Property not found: " + id));
        propertyRepo.deleteById(id);
    }

    // ===== LinkType =====

    public List<OntologyLinkType> listLinkTypes() {
        return linkTypeRepo.findAll();
    }

    public OntologyLinkType getLinkType(Long id) {
        return linkTypeRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("LinkType not found: " + id));
    }

    public OntologyLinkType createLinkType(OntologyLinkType lt) {
        getObjectType(lt.getSourceObjectTypeId());
        getObjectType(lt.getTargetObjectTypeId());
        return linkTypeRepo.save(lt);
    }

    public OntologyLinkType updateLinkType(Long id, OntologyLinkType patch) {
        OntologyLinkType lt = getLinkType(id);
        if (patch.getDisplayName() != null) lt.setDisplayName(patch.getDisplayName());
        if (patch.getDescription() != null) lt.setDescription(patch.getDescription());
        if (patch.getCardinality() != null) lt.setCardinality(patch.getCardinality());
        return linkTypeRepo.save(lt);
    }

    public void deleteLinkType(Long id) {
        getLinkType(id);
        linkTypeRepo.deleteById(id);
    }

    // ===== Schema Graph =====

    public Map<String, Object> getSchemaGraph() {
        List<OntologyObjectType> types = objectTypeRepo.findAll();
        List<OntologyLinkType> links   = linkTypeRepo.findAll();

        List<Map<String, Object>> nodes = new ArrayList<>();
        for (OntologyObjectType ot : types) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id",          "ot_" + ot.getId());
            node.put("label",       ot.getDisplayName());
            node.put("name",        ot.getName());
            node.put("type",        "ObjectType");
            node.put("color",       ot.getColor() != null ? ot.getColor() : "#5b8dee");
            node.put("icon",        ot.getIcon());
            node.put("propertyCount", propertyRepo.findByObjectTypeIdOrderBySortOrder(ot.getId()).size());
            nodes.add(node);
        }

        List<Map<String, Object>> edges = new ArrayList<>();
        for (OntologyLinkType lt : links) {
            Map<String, Object> edge = new LinkedHashMap<>();
            edge.put("id",     "lt_" + lt.getId());
            edge.put("source", "ot_" + lt.getSourceObjectTypeId());
            edge.put("target", "ot_" + lt.getTargetObjectTypeId());
            edge.put("label",  lt.getDisplayName());
            edge.put("name",   lt.getName());
            edge.put("cardinality", lt.getCardinality());
            edges.add(edge);
        }

        Map<String, Object> graph = new LinkedHashMap<>();
        graph.put("nodes", nodes);
        graph.put("edges", edges);
        return graph;
    }
}
