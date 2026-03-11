#!/usr/bin/env bash
# If invoked through `sh`, switch to bash before running bash-specific syntax.

cd frontend
npm install
# 补充删除9002端口占用
lsof -i :9002 | grep LISTEN | awk '{print $2}' | xargs kill -9
nohup npm run dev > ./logs/dev-frontend.log 2>&1 &