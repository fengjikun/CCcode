package com.cccode.devicemanager.controller;

import com.cccode.devicemanager.model.Device;
import com.cccode.devicemanager.service.DeviceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceService service;

    public DeviceController(DeviceService service) {
        this.service = service;
    }

    @GetMapping
    public List<Device> search(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String type
    ) {
        return service.search(keyword, status, type);
    }

    @GetMapping("/{id}")
    public Device getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Device> create(@Valid @RequestBody Device device) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(device));
    }

    @PutMapping("/{id}")
    public Device update(@PathVariable Long id, @Valid @RequestBody Device device) {
        return service.update(id, device);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(
        @PathVariable Long id,
        @RequestBody Map<String, String> body
    ) {
        Device.DeviceStatus status = Device.DeviceStatus.valueOf(body.get("status").toUpperCase());
        service.updateStatus(id, status);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/types")
    public List<String> getTypes() {
        return service.getTypes();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
    }
}
