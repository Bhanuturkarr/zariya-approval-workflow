package com.zariya.workflow.api;

import com.zariya.workflow.api.WorkspaceDto.*;
import com.zariya.workflow.service.WorkspaceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class WorkspaceController {
    private final WorkspaceService workspace;
    public WorkspaceController(WorkspaceService workspace) { this.workspace = workspace; }
    @GetMapping("/workspace") public WorkspaceDto workspace() { return workspace.workspace(); }
    @GetMapping("/health") public java.util.Map<String, String> health() { return java.util.Map.of("status", "ok", "service", "zariya-api"); }

    @PostMapping("/applications")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceDto create(@Valid @RequestBody CreateRequest request) {
        return workspace.create(new CreateApplication(request.institution(), request.applicationType(), request.region(), request.owner(), request.dueDate(), request.priority()));
    }
    @PatchMapping("/applications/{id}/stage")
    public WorkspaceDto updateStage(@PathVariable long id, @Valid @RequestBody StageRequest request) {
        return workspace.updateStage(id, new StageUpdate(request.stage(), request.actor()));
    }
    @PatchMapping("/applications/{id}/documents")
    public WorkspaceDto updateDocument(@PathVariable long id, @Valid @RequestBody DocumentRequest request) {
        return workspace.updateDocument(id, new DocumentUpdate(request.name(), request.status(), request.actor()));
    }
    @PatchMapping("/alerts/{id}/acknowledge")
    public WorkspaceDto acknowledge(@PathVariable long id, @RequestBody(required = false) ActorRequest request) {
        return workspace.acknowledge(id, new ActorUpdate(request == null ? "Zariya" : request.actor()));
    }

    public record CreateRequest(@NotBlank String institution,
                                @NotBlank String applicationType,
                                @Pattern(regexp = "North|South|East|West") String region,
                                String owner,
                                java.time.LocalDate dueDate,
                                String priority) {}
    public record StageRequest(@NotBlank String stage, String actor) {}
    public record DocumentRequest(@NotBlank String name, @NotBlank String status, String actor) {}
    public record ActorRequest(String actor) {}
}
