# Backup y Recuperación ante Desastres de Almacenes de Datos

> **Navegación Bilingüe:** [English Version](./data-store-backup-dr.md)

Este runbook codifica los procedimientos de backup y recuperación ante desastres para cada almacén de datos stateful en el stack de infraestructura de referencia. Reemplaza la recuperación ad-hoc con operaciones repetibles y documentadas.

## Objetivos de Recuperación

| Servicio | RPO | RTO | Método de Backup |
| :--- | :--- | :--- | :--- |
| PostgreSQL | ≤ 5 min (archivado WAL) | ≤ 30 min | `pg_dump` + PITR WAL |
| MongoDB | ≤ 15 min | ≤ 1 hr | `mongodump` + oplog |
| MinIO | ≤ 1 hr (latencia de mirror) | ≤ 1 hr | `mc mirror` |
| OpenBao | ≤ 1 hr (intervalo de snapshot) | ≤ 15 min | `bao operator raft snapshot` |

---

## PostgreSQL — `pg_dump` / PITR

### Backup

```bash
# Backup lógico (esquema + datos)
docker exec ums-postgres pg_dump -U ums_user -d ums_db -Fc > ums-postgres-$(date +%Y%m%d-%H%M).dump

# Archivado WAL para PITR — habilitar en postgresql.conf:
#   archive_mode = on
#   archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

### Restauración

```bash
# Eliminar y recrear la base de datos
docker exec ums-postgres dropdb -U ums_user ums_db
docker exec ums-postgres createdb -U ums_user ums_db

# Restaurar desde backup lógico
cat ums-postgres-YYYYMMDD-HHMM.dump | docker exec -i ums-postgres pg_restore -U ums_user -d ums_db --no-owner
```

### PITR (Recuperación Punto-en-Tiempo)

```bash
# Restaurar backup base, luego reproducir WAL hasta una marca de tiempo
docker exec ums-postgres pg_wal_replay --target-time='2026-06-24 14:30:00' /var/lib/postgresql/wal_archive
```

---

## MongoDB — `mongodump`

### Backup

```bash
# Dump completo de la base de datos
docker exec ums-mongodb mongodump -u ums_user -p ${MONGO_PASSWORD} --authenticationDatabase admin --out /tmp/backup
docker cp ums-mongodb:/tmp/backup ./backup-mongodb-$(date +%Y%m%d-%H%M)
```

### Restauración

```bash
# Restaurar desde dump
docker cp ./backup-mongodb-YYYYMMDD-HHMM ums-mongodb:/tmp/restore
docker exec ums-mongodb mongorestore -u ums_user -p ${MONGO_PASSWORD} --authenticationDatabase admin /tmp/restore
```

### PITR Basado en Oplog

```bash
# Habilitar conjunto de réplicas para oplog (solo producción)
# Reproducir oplog hasta una marca de tiempo específica:
docker exec ums-mongodb mongorestore --oplogReplay --oplogLimit '{"ts": {"$timestamp": {"t": 1719216600, "i": 1}}}' /tmp/restore
```

---

## MinIO — `mc mirror`

### Backup

```bash
# Instalar cliente mc localmente
mc alias set ums-minio http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Espejar todos los buckets a una ruta de backup local
mc mirror ums-minio ./backup-minio-$(date +%Y%m%d-%H%M)

# O espejar a un destino MinIO/S3 secundario
mc mirror ums-minio backup-target/ums-minio
```

### Restauración

```bash
# Espejar de vuelta desde backup a MinIO
mc mirror ./backup-minio-YYYYMMDD-HHMM ums-minio
```

---

## OpenBao — Snapshot

### Backup

```bash
# Snapshot de Raft (para modo HA / clúster)
docker exec ums-openbao bao operator raft snapshot save /tmp/bao-snapshot-$(date +%Y%m%d).snap
docker cp ums-openbao:/tmp/bao-snapshot-YYYYMMDD.snap ./backup-openbao/

# Snapshot de nodo único en modo dev
docker exec ums-openbao bao snapshot save /tmp/bao-snapshot-$(date +%Y%m%d).snap
docker cp ums-openbao:/tmp/bao-snapshot-YYYYMMDD.snap ./backup-openbao/
```

### Restauración

```bash
# Restaurar snapshot de Raft
docker exec -i ums-openbao bao operator raft snapshot restore < ./backup-openbao/bao-snapshot-YYYYMMDD.snap

# Restaurar en modo dev
docker exec -i ums-openbao bao snapshot restore < ./backup-openbao/bao-snapshot-YYYYMMDD.snap
```

---

## Programación de Backups (Recomendada)

| Servicio | Frecuencia | Retención | Almacenamiento |
| :--- | :--- | :--- | :--- |
| PostgreSQL | `pg_dump` diario + WAL continuo | 7 días lógico, 30 días WAL | Local + fuera del sitio |
| MongoDB | `mongodump` diario | 7 días | Local + fuera del sitio |
| MinIO | `mc mirror` por hora | 24 snapshots horarios | Almacenamiento secundario |
| OpenBao | Snapshot diario | 7 días | Local + fuera del sitio |

---

## Lista de Verificación de Ejercicio DR

1. Detener todos los servicios: `docker-compose down`
2. Eliminar volúmenes nombrados (simular pérdida de datos): `docker volume rm <volume_name>`
3. Restaurar cada servicio desde backup usando los procedimientos anteriores
4. Verificar integridad de datos (consultar filas de ejemplo, verificar conteos de objetos)
5. Reiniciar el stack completo y ejecutar healthchecks
6. Documentar cualquier brecha o fallo en el reporte post-ejercicio

---

[Volver a la Raíz de Operaciones](./README.es.md)
