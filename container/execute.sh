#!/bin/bash
set -e

# This script is invoked by Cloudflare Containers
# It receives the prompt and environment variables via stdin/env

# Read input JSON from stdin
INPUT=$(cat)

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt')

# Extract and set environment variables
if [ -n "$(echo "$INPUT" | jq -r '.env.GITHUB_TOKEN')" ]; then
    export GITHUB_TOKEN=$(echo "$INPUT" | jq -r '.env.GITHUB_TOKEN')
fi

if [ -n "$(echo "$INPUT" | jq -r '.env.LINEAR_API_KEY')" ]; then
    export LINEAR_API_KEY=$(echo "$INPUT" | jq -r '.env.LINEAR_API_KEY')
fi

# Create a temporary directory for the work
WORK_DIR="/tmp/bugbot-work-$$"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Execute Claude Code with the prompt
# Using --non-interactive mode and capturing output
OUTPUT_FILE="$WORK_DIR/output.txt"
ERROR_FILE="$WORK_DIR/error.txt"
SUCCESS=0

echo "$PROMPT" | claude-code --non-interactive > "$OUTPUT_FILE" 2> "$ERROR_FILE" || SUCCESS=$?

# Collect changes summary from git log
CHANGES=""
if [ -d .git ]; then
    CHANGES=$(git log --oneline -5 2>/dev/null || echo "No commits")
fi

# Build response JSON
if [ $SUCCESS -eq 0 ]; then
    jq -n \
        --arg changes "$CHANGES" \
        --arg output "$(cat "$OUTPUT_FILE")" \
        '{success: true, changes: $changes, output: $output}'
else
    jq -n \
        --arg error "$(cat "$ERROR_FILE")" \
        --arg output "$(cat "$OUTPUT_FILE")" \
        '{success: false, error: $error, output: $output}'
fi

# Cleanup
cd /
rm -rf "$WORK_DIR"
