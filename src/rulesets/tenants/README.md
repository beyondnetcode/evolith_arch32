# Evolith Tenant Configurations

Each subdirectory represents one tenant (a satellite organization using Evolith governance).

## Structure

```
rulesets/tenants/
  {tenant-id}/
    tenant.json          # Tenant identity and capabilities (→ schema/tenant.schema.json)
    overrides.json       # Delta customizations over the base ruleset (→ schema/tenant-override.schema.json)
    waivers/
      {WVR-ID}.json      # Individual waiver documents (→ schema/waiver.schema.json)
```

## Rules

1. `tenant.json` must validate against `../schema/tenant.schema.json`.
2. `overrides.json` must validate against `../schema/tenant-override.schema.json`.
3. Overrides **cannot** remove items from `blockingCriteria`.
4. Waivers require `waiverAuthority` matching the gate's declared authority.
5. Expired waivers (`expirationDate < today`) are treated as non-existent.
6. OPA policy `rulesets/opa/multi-tenancy.rego` enforces these constraints at evaluation time.

## Adding a Tenant

```bash
mkdir rulesets/tenants/my-company
cp rulesets/tenants/example/tenant.json rulesets/tenants/my-company/tenant.json
# Edit tenant.json with real values, then validate:
ajv validate -s rulesets/schema/tenant.schema.json -d rulesets/tenants/my-company/tenant.json
```
