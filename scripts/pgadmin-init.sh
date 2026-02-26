#!/bin/sh
set -eu

# Re-create pgAdmin internal DB so servers config is re-imported on start.
rm -f /var/lib/pgadmin/pgadmin4.db
SERVER_JSON_FILE="${PGADMIN_SERVER_JSON_FILE:-/var/lib/pgadmin/servers.json}"

cat > "${SERVER_JSON_FILE}" <<JSON
{
  "Servers": {
    "1": {
      "Name": "${PGADMIN_SERVER_NAME:-CBT Postgres}",
      "Group": "Servers",
      "Host": "${PGADMIN_DB_HOST}",
      "Port": ${PGADMIN_DB_PORT},
      "MaintenanceDB": "${PGADMIN_DB_NAME}",
      "Username": "${PGADMIN_DB_USER}",
      "Password": "${PGADMIN_DB_PASSWORD}",
      "SavePassword": true,
      "SSLMode": "prefer"
    }
  }
}
JSON

exec /entrypoint.sh
