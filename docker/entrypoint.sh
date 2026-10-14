#!/bin/sh
set -eu

node bootstrap.mjs
exec node server.js
