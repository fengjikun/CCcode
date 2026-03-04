package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyLinkType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OntologyLinkTypeRepository extends JpaRepository<OntologyLinkType, Long> {
    Optional<OntologyLinkType> findByName(String name);
    List<OntologyLinkType> findBySourceObjectTypeId(Long sourceObjectTypeId);
    List<OntologyLinkType> findByTargetObjectTypeId(Long targetObjectTypeId);
}
