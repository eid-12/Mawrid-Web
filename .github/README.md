# GitHub Automation

This directory contains GitHub workflow automation for the Mawrid project.

## Workflow

- `workflows/main.yml`
  - Trigger: push to `main`
  - Jobs:
    - Build and push frontend Docker image
    - Build and push backend Docker image

## Required GitHub Secrets

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## Docker Tags

- `minipcer/mawrid-frontend:latest`
- `minipcer/mawrid-backend:latest`

## Related Docs

- Project root: [`../README.md`](../README.md)
