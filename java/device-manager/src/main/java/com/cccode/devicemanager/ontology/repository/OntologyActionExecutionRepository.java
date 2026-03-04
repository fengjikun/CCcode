package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyActionExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyActionExecutionRepository extends JpaRepository<OntologyActionExecution, Long> {
    List<OntologyActionExecution> findByActionTypeIdOrderByExecutedAtDesc(Long actionTypeId);
}
