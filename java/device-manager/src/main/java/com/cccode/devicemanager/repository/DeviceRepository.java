package com.cccode.devicemanager.repository;

import com.cccode.devicemanager.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    @Query("SELECT d FROM Device d WHERE " +
           "(:keyword IS NULL OR d.name LIKE %:keyword% OR d.type LIKE %:keyword% OR d.location LIKE %:keyword%) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:type IS NULL OR d.type = :type)")
    List<Device> search(
        @Param("keyword") String keyword,
        @Param("status") Device.DeviceStatus status,
        @Param("type") String type
    );

}
