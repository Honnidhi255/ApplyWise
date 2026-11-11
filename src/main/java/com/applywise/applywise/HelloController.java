
package com.applywise.applywise;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.ResponseEntity;

import jakarta.validation.Valid;
import java.util.List;

@CrossOrigin
@RestController
public class HelloController {

    private final JobApplicationRepository repository;

    public HelloController(JobApplicationRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/hello")
    public String hello() {
        return "Welcome to ApplyWise!";
    }

    @PostMapping("/api/applications")
    public JobApplication createApplication(
            @Valid @RequestBody JobApplication application) {
        return repository.save(application);
    }

    @GetMapping("/api/applications")
    public List<JobApplication> getApplications() {
        return repository.findAll();
    }

    @GetMapping("/api/applications/{id}")
    public ResponseEntity<JobApplication> getApplicationById(
            @PathVariable Long id) {

        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/applications/{id}")
    public ResponseEntity<JobApplication> updateApplication(
            @PathVariable Long id,
            @RequestBody JobApplication updatedApplication) {

        JobApplication existingApplication =
                repository.findById(id).orElse(null);

        if (existingApplication == null) {
            return ResponseEntity.notFound().build();
        }

        existingApplication.setCompany(updatedApplication.getCompany());
        existingApplication.setRole(updatedApplication.getRole());
        existingApplication.setStatus(updatedApplication.getStatus());
        existingApplication.setAppliedDate(updatedApplication.getAppliedDate());
        existingApplication.setJobUrl(updatedApplication.getJobUrl());
        existingApplication.setNotes(updatedApplication.getNotes());

        return ResponseEntity.ok(repository.save(existingApplication));
    }

    @DeleteMapping("/api/applications/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
