package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyFunctionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyFunctionLogRepository extends JpaRepository<OntologyFunctionLog, Long> {
    List<OntologyFunctionLog> findByFunctionIdOrderByExecutedAtDesc(Long functionId);
    List<OntologyFunctionLog> findByActionExecutionIdOrderByExecutedAtDesc(Long actionExecutionId);
}
