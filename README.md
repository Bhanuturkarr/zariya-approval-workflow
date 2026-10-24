# Zariya Approval Workflow

Zariya is a responsive workflow demo for Team Zariya's SIH 2026 concept: approval processing, document tracking, compliance monitoring and deadline alerts.

## Live demo

The frontend is published at <https://bhanuturkarr.github.io/zariya-approval-workflow/>. The overview greeting is **ZARIYA**. GitHub Pages uses browser storage so changes made in the demo stay in that browser.

## Features

- Search and filter the application queue; open case details
- Create applications and assign region, owner, due date and priority
- Move cases through intake, review, document, EVC, decision, compliance and approval stages
- Update required document statuses
- Review and acknowledge deadline alerts, with an audit trail
- Monitor regional document-completion rates and export the queue to CSV
- Keep a responsive dashboard usable on desktop and mobile
- Run deadline alert generation on the API when a case is due within two days or overdue

Sample institutions and activity are illustrative only. The demo does not connect to AICTE systems and does not provide production authentication or regulatory decision-making.

## Run the full stack

Install Docker Desktop, then from the repository root run:

```sh
docker compose up --build
```

Open <http://localhost:5173>. The React/Vite frontend talks to a Spring Boot API at port 8080, backed by PostgreSQL at port 5432. PostgreSQL data persists in the `zariya-data` Docker volume. Stop the services with `docker compose down`; use `docker compose down -v` only if you also want to erase the saved database volume.

To run only the static browser demo, use the live demo link above. It saves changes locally in the browser and does not share data across users or devices.

## API

- `GET /api/workspace` returns applications, dashboard metrics, alerts, audit events and regional compliance.
- `GET /api/health` checks API availability.
- `POST /api/applications` creates an intake case.
- `PATCH /api/applications/{id}/stage` changes a workflow stage.
- `PATCH /api/applications/{id}/documents` updates a document status.
- `PATCH /api/alerts/{id}/acknowledge` acknowledges an alert.

The backend CI workflow compiles and verifies the Spring Boot project with Java 21. The Pages workflow builds the frontend and publishes the `docs` artifact on pushes to `main`.
