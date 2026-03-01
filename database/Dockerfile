FROM postgres:17-bookworm
USER root

RUN apt-get update && \
    apt-get install -y wget unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ADD script.sh /usr/local/bin/script.sh
RUN chmod +x /usr/local/bin/script.sh

COPY create_db.sql /docker-entrypoint-initdb.d/01-create_db.sql
COPY insert_db.sql /docker-entrypoint-initdb.d/02-insert_db.sql

ENTRYPOINT ["script.sh"]