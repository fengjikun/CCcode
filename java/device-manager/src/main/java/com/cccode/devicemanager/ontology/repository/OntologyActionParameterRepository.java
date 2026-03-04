package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyActionParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyActionParameterRepository extends JpaRepository<OntologyActionParameter, Long> {
    List<OntologyActionParameter> findByActionTypeIdOrderBySortOrder(Long actionTypeId);
    void deleteByActionTypeId(Long actionTypeId);
}
