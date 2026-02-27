package com.cccode.devicemanager.service;

import com.cccode.devicemanager.model.Device;
import com.cccode.devicemanager.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DeviceService {

    private final DeviceRepository repo;

    public DeviceService(DeviceRepository repo) {
        this.repo = repo;
    }

    public List<Device> search(String keyword, String status, String type) {
        Device.DeviceStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = Device.DeviceStatus.valueOf(status.toUpperCase());
        }
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        String tp = (type != null && !type.isBlank()) ? type : null;
        return repo.search(kw, statusEnum, tp);
    }

    public Device findById(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("设备不存在：id=" + id));
    }

    public Device create(Device device) {
        device.setId(null);
        return repo.save(device);
    }

    public Device update(Long id, Device updated) {
        Device existing = findById(id);
        existing.setName(updated.getName());
        existing.setType(updated.getType());
        existing.setLocation(updated.getLocation());
        existing.setStatus(updated.getStatus());
        existing.setDescription(updated.getDescription());
        return repo.save(existing);
    }

    public void updateStatus(Long id, Device.DeviceStatus status) {
        Device device = findById(id);
        device.setStatus(status);
        repo.save(device);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("设备不存在：id=" + id);
        }
        repo.deleteById(id);
    }

    public List<String> getTypes() {
        return repo.findAll().stream()
            .map(Device::getType)
            .filter(t -> t != null && !t.isBlank())
            .distinct()
            .sorted()
            .collect(Collectors.toList());
    }
}
