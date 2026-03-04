package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OntologyActionTypeRepository extends JpaRepository<OntologyActionType, Long> {
    Optional<OntologyActionType> findByName(String name);
    List<OntologyActionType> findByStatus(String status);
}
