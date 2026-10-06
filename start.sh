#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
read -rsp "Вставь GigaChat Authorization Key и нажми Enter: " GIGACHAT_API_KEY
printf '\n'
export GIGACHAT_API_KEY
node server.js
