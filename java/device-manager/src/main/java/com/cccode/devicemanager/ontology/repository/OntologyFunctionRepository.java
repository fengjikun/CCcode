package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyFunction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OntologyFunctionRepository extends JpaRepository<OntologyFunction, Long> {
    Optional<OntologyFunction> findByName(String name);
    List<OntologyFunction> findByActionTypeId(Long actionTypeId);
    List<OntologyFunction> findByStatus(String status);
}
