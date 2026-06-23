# Distributed Modules — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines the evidence and validation practices required to demonstrate distributed module operational readiness. Evidence covers validation commands, deployment metrics, contract testing, extraction readiness, and tracing data.

## Validation Commands

Operational readiness is verified through repeatable validation commands that modules must pass.

- **Contract validation**: Validate all module contracts against the schema registry for compatibility and completeness.
- **Dependency validation**: Verify module dependency graph has no cycles and respects shared kernel boundaries.
- **Health endpoint validation**: Confirm all modules expose liveness and readiness endpoints that return correct status.
- **Secret validation**: Verify no secrets are present in code, configuration files, or container images.

## Deployment Metrics

Deployment frequency and lead time are tracked as key indicators of module operational maturity.

- **Deployment frequency**: Target at least one production deployment per module per week.
- **Lead time**: Time from commit to production; target under 30 minutes for standard changes.
- **Change failure rate**: Percentage of deployments causing incidents; target below 5%.
- **Rollback rate**: Percentage of deployments requiring rollback; tracked for trend analysis.

## Contract Test Results

Contract testing validates inter-module communication correctness and backward compatibility.

- **Provider tests**: Each module runs provider contract tests against its published contracts.
- **Consumer tests**: Each module runs consumer contract tests against its upstream dependencies.
- **Compatibility matrix**: CI produces a compatibility matrix showing which contract version pairs are valid.
- **Breaking change detection**: Automated detection of contract changes that break backward compatibility.

## Extraction Readiness Evidence

Evidence supporting a module's readiness for F3 extraction is documented and reviewed.

- **Extraction score report**: Current extraction readiness score with component breakdown.
- **Independence checklist**: Evidence for each independence criterion (deploy, data, contract, team, operations).
- **Risk assessment**: Identified risks and mitigations for the proposed extraction.
- **Pilot results**: If a pilot extraction was performed, results and lessons learned.

## Tracing Evidence

Distributed tracing data provides evidence of inter-module communication health and performance.

- **Trace coverage**: Percentage of inter-module calls captured in traces; target above 95%.
- **Latency percentiles**: P50, P95, P99 latencies for each inter-module call path.
- **Error trace rate**: Percentage of traces containing errors; monitored for anomalies.
- **Service map accuracy**: Tracing data validates the actual module dependency graph matches the declared topology.

---

[Back to Distributed Modules Profile](./README.md)
