package com.cccode.devicemanager.ontology.repository;

import com.cccode.devicemanager.ontology.model.OntologyProperty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OntologyPropertyRepository extends JpaRepository<OntologyProperty, Long> {
    List<OntologyProperty> findByObjectTypeIdOrderBySortOrder(Long objectTypeId);
    void deleteByObjectTypeId(Long objectTypeId);
}
