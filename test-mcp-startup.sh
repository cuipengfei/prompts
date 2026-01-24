#!/bin/bash
# MCP Startup Optimization Test Script
# Tests the effect of MCP_CONNECTION_NONBLOCKING and MCP_SERVER_CONNECTION_BATCH_SIZE

LOG_FILE="/mnt/d/code/prompts/mcp-startup-test.log"
ROUNDS=${1:-3}  # Default 3 rounds, can override with argument

# Clear previous log
> "$LOG_FILE"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

run_test() {
    local name="$1"
    local nonblocking="$2"
    local batch_size="$3"

    log "  Running: $name"
    log "    NONBLOCKING=$nonblocking, BATCH_SIZE=$batch_size"

    start_time=$(date +%s.%N)

    MCP_CONNECTION_NONBLOCKING="$nonblocking" \
    MCP_SERVER_CONNECTION_BATCH_SIZE="$batch_size" \
    claude -p "respond with just: ok" --dangerously-skip-permissions 2>/dev/null | head -1 > /dev/null

    end_time=$(date +%s.%N)
    elapsed=$(echo "$end_time - $start_time" | bc)

    log "    Elapsed: ${elapsed}s"
    echo "$elapsed"
}

log "=============================================="
log "MCP Startup Optimization Test"
log "=============================================="
log "Rounds: $ROUNDS"
log "MCP Servers: $(ls ~/.claude/.mcp*.json 2>/dev/null | wc -l) config files"
log ""

# Arrays to store results
declare -a results_disabled
declare -a results_nonblocking
declare -a results_batch
declare -a results_both

for round in $(seq 1 $ROUNDS); do
    log "--- Round $round/$ROUNDS ---"

    # Test 1: Both disabled (baseline)
    t=$(run_test "Disabled (baseline)" "" "")
    results_disabled+=("$t")

    # Test 2: Only NONBLOCKING
    t=$(run_test "NONBLOCKING=1 only" "1" "")
    results_nonblocking+=("$t")

    # Test 3: Only BATCH_SIZE
    t=$(run_test "BATCH_SIZE=8 only" "" "8")
    results_batch+=("$t")

    # Test 4: Both enabled
    t=$(run_test "Both enabled" "1" "8")
    results_both+=("$t")

    log ""
done

# Calculate averages
calc_avg() {
    local arr=("$@")
    local sum=0
    for v in "${arr[@]}"; do
        sum=$(echo "$sum + $v" | bc)
    done
    echo "scale=2; $sum / ${#arr[@]}" | bc
}

avg_disabled=$(calc_avg "${results_disabled[@]}")
avg_nonblocking=$(calc_avg "${results_nonblocking[@]}")
avg_batch=$(calc_avg "${results_batch[@]}")
avg_both=$(calc_avg "${results_both[@]}")

log "=============================================="
log "RESULTS SUMMARY (Average of $ROUNDS rounds)"
log "=============================================="
log ""
log "| Configuration              | Avg Time  | vs Baseline |"
log "|----------------------------|-----------|-------------|"

# Calculate speedup percentages
speedup_nonblocking=$(echo "scale=0; (1 - $avg_nonblocking / $avg_disabled) * 100" | bc)
speedup_batch=$(echo "scale=0; (1 - $avg_batch / $avg_disabled) * 100" | bc)
speedup_both=$(echo "scale=0; (1 - $avg_both / $avg_disabled) * 100" | bc)

log "| Disabled (baseline)        | ${avg_disabled}s     | -           |"
log "| NONBLOCKING=1 only         | ${avg_nonblocking}s     | ${speedup_nonblocking}% faster  |"
log "| BATCH_SIZE=8 only          | ${avg_batch}s     | ${speedup_batch}% faster  |"
log "| Both enabled (recommended) | ${avg_both}s     | ${speedup_both}% faster  |"
log ""
log "Raw data:"
log "  Disabled:    ${results_disabled[*]}"
log "  NONBLOCKING: ${results_nonblocking[*]}"
log "  BATCH_SIZE:  ${results_batch[*]}"
log "  Both:        ${results_both[*]}"
log ""
log "=============================================="
log "TEST COMPLETED"
log "=============================================="
