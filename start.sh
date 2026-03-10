#!/usr/bin/env bash
# If invoked through `sh`, switch to bash before running bash-specific syntax.

cd frontend
npm install
nohup npm run dev > ./logs/dev-frontend.log 2>&1 &