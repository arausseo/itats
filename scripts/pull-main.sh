#!/bin/bash
set -e

echo "[v0] Fetching latest changes from remote..."
git fetch origin main

echo "[v0] Current branch:"
git branch -v

echo "[v0] Pulling changes from main..."
git pull origin main

echo "[v0] Pull completed successfully"
git log --oneline -5
