package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyLinkRepository extends JpaRepository<OntologyLink, Long> {
    List<OntologyLink> findBySourceObjectId(Long sourceObjectId);
    List<OntologyLink> findByTargetObjectId(Long targetObjectId);
    List<OntologyLink> findByLinkTypeId(Long linkTypeId);
    List<OntologyLink> findBySourceObjectIdOrTargetObjectId(Long sourceObjectId, Long targetObjectId);
}
