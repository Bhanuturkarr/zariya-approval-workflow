package com.zariya.workflow.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SeedDataRunner implements CommandLineRunner {
    private final WorkspaceService workspace;
    public SeedDataRunner(WorkspaceService workspace) { this.workspace = workspace; }
    @Override public void run(String... args) { workspace.seedIfEmpty(); }
}
