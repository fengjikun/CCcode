package com.cccode.devicemanager.diagnosis;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FaultRecordRepository extends JpaRepository<FaultRecord, Long> {
    List<FaultRecord> findByDeviceIdOrderByReportedAtDesc(Long deviceId);
    List<FaultRecord> findAllByOrderByReportedAtDesc();
}
