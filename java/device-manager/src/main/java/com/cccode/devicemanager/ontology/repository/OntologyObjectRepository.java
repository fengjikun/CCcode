package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyObject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OntologyObjectRepository extends JpaRepository<OntologyObject, Long> {
    List<OntologyObject> findByObjectTypeId(Long objectTypeId);
    Optional<OntologyObject> findByObjectTypeIdAndId(Long objectTypeId, Long id);
    void deleteByObjectTypeId(Long objectTypeId);
}
