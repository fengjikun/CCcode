package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyObjectType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OntologyObjectTypeRepository extends JpaRepository<OntologyObjectType, Long> {
    Optional<OntologyObjectType> findByName(String name);
    boolean existsByName(String name);
}
