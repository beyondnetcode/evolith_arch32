# Data Store Backup & Disaster Recovery

> **Bilingual Navigation:** [Versión en Español](./data-store-backup-dr.es.md)

This runbook codifies backup and disaster-recovery procedures for every stateful data store in the reference infrastructure stack. It replaces ad-hoc recovery with repeatable, documented operations.

## Recovery Objectives

| Service | RPO | RTO | Backup Method |
| :--- | :--- | :--- | :--- |
| PostgreSQL | ≤ 5 min (WAL archiving) | ≤ 30 min | `pg_dump` + WAL PITR |
| MongoDB | ≤ 15 min | ≤ 1 hr | `mongodump` + oplog |
| MinIO | ≤ 1 hr (mirror lag) | ≤ 1 hr | `mc mirror` |
| OpenBao | ≤ 1 hr (snapshot interval) | ≤ 15 min | `bao operator raft snapshot` |

---

## PostgreSQL — `pg_dump` / PITR

### Backup

```bash
# Logical backup (schema + data)
docker exec ums-postgres pg_dump -U ums_user -d ums_db -Fc > ums-postgres-$(date +%Y%m%d-%H%M).dump

# WAL archiving for PITR — enable in postgresql.conf:
#   archive_mode = on
#   archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

### Restore

```bash
# Drop and recreate the database
docker exec ums-postgres dropdb -U ums_user ums_db
docker exec ums-postgres createdb -U ums_user ums_db

# Restore from logical backup
cat ums-postgres-YYYYMMDD-HHMM.dump | docker exec -i ums-postgres pg_restore -U ums_user -d ums_db --no-owner
```

### PITR (Point-in-Time Recovery)

```bash
# Restore base backup, then replay WAL up to a timestamp
docker exec ums-postgres pg_wal_replay --target-time='2026-06-24 14:30:00' /var/lib/postgresql/wal_archive
```

---

## MongoDB — `mongodump`

### Backup

```bash
# Full database dump
docker exec ums-mongodb mongodump -u ums_user -p ${MONGO_PASSWORD} --authenticationDatabase admin --out /tmp/backup
docker cp ums-mongodb:/tmp/backup ./backup-mongodb-$(date +%Y%m%d-%H%M)
```

### Restore

```bash
# Restore from dump
docker cp ./backup-mongodb-YYYYMMDD-HHMM ums-mongodb:/tmp/restore
docker exec ums-mongodb mongorestore -u ums_user -p ${MONGO_PASSWORD} --authenticationDatabase admin /tmp/restore
```

### Oplog-Based PITR

```bash
# Enable replica set for oplog (production only)
# Replay oplog to a specific timestamp:
docker exec ums-mongodb mongorestore --oplogReplay --oplogLimit '{"ts": {"$timestamp": {"t": 1719216600, "i": 1}}}' /tmp/restore
```

---

## MinIO — `mc mirror`

### Backup

```bash
# Install mc client locally
mc alias set ums-minio http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Mirror all buckets to a local backup path
mc mirror ums-minio ./backup-minio-$(date +%Y%m%d-%H%M)

# Or mirror to a secondary MinIO / S3 target
mc mirror ums-minio backup-target/ums-minio
```

### Restore

```bash
# Mirror back from backup to MinIO
mc mirror ./backup-minio-YYYYMMDD-HHMM ums-minio
```

---

## OpenBao — Snapshot

### Backup

```bash
# Raft snapshot (for HA / cluster mode)
docker exec ums-openbao bao operator raft snapshot save /tmp/bao-snapshot-$(date +%Y%m%d).snap
docker cp ums-openbao:/tmp/bao-snapshot-YYYYMMDD.snap ./backup-openbao/

# Dev-mode single-node snapshot
docker exec ums-openbao bao snapshot save /tmp/bao-snapshot-$(date +%Y%m%d).snap
docker cp ums-openbao:/tmp/bao-snapshot-YYYYMMDD.snap ./backup-openbao/
```

### Restore

```bash
# Restore raft snapshot
docker exec -i ums-openbao bao operator raft snapshot restore < ./backup-openbao/bao-snapshot-YYYYMMDD.snap

# Dev-mode restore
docker exec -i ums-openbao bao snapshot restore < ./backup-openbao/bao-snapshot-YYYYMMDD.snap
```

---

## Backup Schedule (Recommended)

| Service | Frequency | Retention | Storage |
| :--- | :--- | :--- | :--- |
| PostgreSQL | Daily `pg_dump` + continuous WAL | 7 days logical, 30 days WAL | Local + offsite |
| MongoDB | Daily `mongodump` | 7 days | Local + offsite |
| MinIO | Hourly `mc mirror` | 24 hourly snapshots | Secondary storage |
| OpenBao | Daily snapshot | 7 days | Local + offsite |

---

## DR Exercise Checklist

1. Stop all services: `docker-compose down`
2. Wipe named volumes (simulate data loss): `docker volume rm <volume_name>`
3. Restore each service from backup using the procedures above
4. Verify data integrity (query sample rows, check object counts)
5. Restart the full stack and run healthchecks
6. Document any gaps or failures in the post-exercise report

---

[Back to Operations Root](./README.md)
