package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyActionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyActionRuleRepository extends JpaRepository<OntologyActionRule, Long> {
    List<OntologyActionRule> findByActionTypeIdOrderBySortOrder(Long actionTypeId);
    void deleteByActionTypeId(Long actionTypeId);
}
