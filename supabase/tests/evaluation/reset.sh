#!/bin/bash
# يبني القاعدة المحلّيّة من الصفر: المنصّة، ثمّ الجداول والدوالّ الحيّة، ثمّ ترحيلات التقييم.
set -e
D=$(dirname "$0"); export PGPASSWORD=pg
psql -q -h localhost -U postgres -c "drop database if exists adeeb_test" -c "create database adeeb_test" >/dev/null
Q="psql -q -v ON_ERROR_STOP=1 -h localhost -U postgres -d adeeb_test"
$Q -f $D/00_platform.sql -f $D/01_tables.sql -f $D/02_functions.sql
for m in "$@"; do $Q -f "$m"; done
echo "reset ok"
