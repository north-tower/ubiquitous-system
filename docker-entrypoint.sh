#!/bin/sh
set -eu

BAILEYS_ROOT="/app/baileys-auth"
mkdir -p "$BAILEYS_ROOT"
chown -R nestjs:nodejs "$BAILEYS_ROOT"

exec su-exec nestjs:nodejs "$@"
