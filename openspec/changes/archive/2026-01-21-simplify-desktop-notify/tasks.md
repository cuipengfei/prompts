# Tasks: Simplify Desktop Notify

## Phase 0: Viability Validation (Before Coding)

### 0.1 Test Bun Availability in Container
- [ ] Run `docker run -it ubuntu:22.04` and test Bun installation
- [ ] Verify Bun can serve HTTP without additional dependencies
- **Exit criteria:** Bun works in minimal container image

### 0.2 Test SSE Browser Behavior
- [ ] Create minimal SSE server with Bun
- [ ] Open in browser, minimize tab for 10+ minutes
- [ ] Send message and verify notification appears
- **Exit criteria:** SSE messages received in background tab

### 0.3 Test Web Notification Persistence
- [ ] Grant notification permission in browser
- [ ] Refresh page, check `Notification.permission`
- **Exit criteria:** Permission persists across refreshes

### 0.4 Test WSL Port Mapping
- [ ] Start Bun server on port 9999 in WSL
- [ ] Access `http://localhost:9999` from Windows browser
- **Exit criteria:** Auto port mapping works without configuration

### 0.5 Test Detached Process Spawn
- [ ] Spawn detached Bun process from another Bun script
- [ ] Exit parent script, verify child continues
- **Exit criteria:** Server survives hook termination

---

## Phase 1: Core Implementation

### 1.1 Create notify.ts Skeleton
- [ ] Implement dual-mode entry point (client vs server)
- [ ] Add argument parsing for `--serve` and hook type
- **Depends on:** Phase 0 complete

### 1.2 Implement Server Mode
- [ ] `/health` endpoint
- [ ] `/events` SSE endpoint with client management
- [ ] `/notify` POST endpoint with broadcast
- [ ] `/` HTML page with embedded UI
- **Depends on:** 1.1

### 1.3 Implement Client Mode
- [ ] Read JSON from stdin
- [ ] Extract project name from `cwd`
- [ ] Health check with fallback spawn
- [ ] POST notification to server
- **Depends on:** 1.2

### 1.4 Embed HTML
- [ ] Inline HTML as template string
- [ ] SSE connection with auto-reconnect
- [ ] Web Notification integration
- [ ] Minimal status UI
- **Depends on:** 1.2

---

## Phase 2: Integration

### 2.1 Update hooks.json
- [ ] Change command from `notify.sh` to `bun notify.ts`
- [ ] Reduce timeout from 10s to 3s

### 2.2 Update plugin.json
- [ ] Bump version to 2.0.0 (breaking change)
- [ ] Update description

### 2.3 Delete Old Files
- [ ] Remove `notify.sh`

---

## Phase 3: Validation

### 3.1 End-to-End Test
- [ ] Install plugin in Claude Code
- [ ] Open browser tab at localhost:9999
- [ ] Trigger Stop hook, verify notification
- [ ] Trigger Notification hook, verify notification

### 3.2 Edge Cases
- [ ] Test with server not running (should auto-start)
- [ ] Test with browser tab closed (should not crash)
- [ ] Test with port in use (should fail gracefully)

---

## Parallelizable Work

- Phase 0 tasks can run in parallel
- 1.2, 1.3, 1.4 can be developed in parallel after 1.1
- Phase 2 tasks can run in parallel after Phase 1
