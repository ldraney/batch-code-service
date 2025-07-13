#!/bin/bash

# Generate unique 6-digit alphanumeric batch code
# Usage: ./generate-batch-code.sh

set -euo pipefail

# Characters to use (excluding ambiguous ones like 0, O, I, l)
CHARS="123456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CODE_LENGTH=6

# Generate random code
generate_code() {
    local code=""
    for i in $(seq 1 $CODE_LENGTH); do
        local random_index=$((RANDOM % ${#CHARS}))
        code="${code}${CHARS:$random_index:1}"
    done
    echo "$code"
}

# Add timestamp for uniqueness
timestamp_suffix() {
    date +%s | tail -c 4
}

# Main generation logic
main() {
    local base_code
    local timestamp_part
    local final_code
    
    # Generate base code (4 chars) + timestamp suffix (2 chars)
    base_code=$(generate_code | head -c 4)
    timestamp_part=$(timestamp_suffix)
    
    # Combine for 6-digit code
    final_code="${base_code}${timestamp_part}"
    
    # Ensure exactly 6 characters
    final_code=$(echo "$final_code" | head -c 6)
    
    echo "$final_code"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
