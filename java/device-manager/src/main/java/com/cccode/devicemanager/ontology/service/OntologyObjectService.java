package com.cccode.devicemanager.ontology.service;

import com.cccode.devicemanager.ontology.model.*;
import com.cccode.devicemanager.ontology.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class OntologyObjectService {

    private final OntologyObjectRepository objectRepo;
    private final OntologyLinkRepository   linkRepo;
    private final OntologyLinkTypeRepository linkTypeRepo;

    public OntologyObjectService(OntologyObjectRepository objectRepo,
                                  OntologyLinkRepository linkRepo,
                                  OntologyLinkTypeRepository linkTypeRepo) {
        this.objectRepo   = objectRepo;
        this.linkRepo     = linkRepo;
        this.linkTypeRepo = linkTypeRepo;
    }

    // ===== Object CRUD =====

    public List<OntologyObject> listObjects(Long objectTypeId) {
        return objectRepo.findByObjectTypeId(objectTypeId);
    }

    public OntologyObject getObject(Long objectTypeId, Long id) {
        return objectRepo.findByObjectTypeIdAndId(objectTypeId, id)
            .orElseThrow(() -> new NoSuchElementException("Object not found: " + id));
    }

    public OntologyObject getObjectById(Long id) {
        return objectRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Object not found: " + id));
    }

    public OntologyObject createObject(OntologyObject obj) {
        return objectRepo.save(obj);
    }

    public OntologyObject updateObject(Long objectTypeId, Long id, OntologyObject patch) {
        OntologyObject obj = getObject(objectTypeId, id);
        if (patch.getPropertiesJson() != null) obj.setPropertiesJson(patch.getPropertiesJson());
        if (patch.getExternalId() != null)     obj.setExternalId(patch.getExternalId());
        return objectRepo.save(obj);
    }

    public OntologyObject updateObjectById(Long id, OntologyObject patch) {
        OntologyObject obj = getObjectById(id);
        if (patch.getPropertiesJson() != null) obj.setPropertiesJson(patch.getPropertiesJson());
        if (patch.getExternalId() != null)     obj.setExternalId(patch.getExternalId());
        return objectRepo.save(obj);
    }

    public void deleteObject(Long objectTypeId, Long id) {
        OntologyObject obj = getObject(objectTypeId, id);
        // Remove associated links
        List<OntologyLink> links = linkRepo.findBySourceObjectIdOrTargetObjectId(obj.getId(), obj.getId());
        linkRepo.deleteAll(links);
        objectRepo.deleteById(id);
    }

    public void deleteObjectById(Long id) {
        getObjectById(id);
        List<OntologyLink> links = linkRepo.findBySourceObjectIdOrTargetObjectId(id, id);
        linkRepo.deleteAll(links);
        objectRepo.deleteById(id);
    }

    // ===== Link CRUD =====

    public List<Map<String, Object>> getObjectLinks(Long objectId) {
        List<OntologyLink> links = linkRepo.findBySourceObjectIdOrTargetObjectId(objectId, objectId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (OntologyLink link : links) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id",             link.getId());
            item.put("linkTypeId",     link.getLinkTypeId());
            item.put("sourceObjectId", link.getSourceObjectId());
            item.put("targetObjectId", link.getTargetObjectId());
            item.put("createdAt",      link.getCreatedAt());
            linkTypeRepo.findById(link.getLinkTypeId()).ifPresent(lt -> {
                item.put("linkTypeName",        lt.getName());
                item.put("linkTypeDisplayName", lt.getDisplayName());
            });
            result.add(item);
        }
        return result;
    }

    public OntologyLink createLink(OntologyLink link) {
        getObjectById(link.getSourceObjectId());
        getObjectById(link.getTargetObjectId());
        linkTypeRepo.findById(link.getLinkTypeId())
            .orElseThrow(() -> new NoSuchElementException("LinkType not found: " + link.getLinkTypeId()));
        return linkRepo.save(link);
    }

    public void deleteLink(Long id) {
        linkRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Link not found: " + id));
        linkRepo.deleteById(id);
    }
}
