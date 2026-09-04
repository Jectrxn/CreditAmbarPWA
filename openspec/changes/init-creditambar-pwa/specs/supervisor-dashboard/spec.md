# supervisor-dashboard

## Requirements
1. The dashboard MUST display real-time (or near real-time) aggregated metrics of all active cashier sessions.
2. The supervisor MUST be able to force-close any active cashier session.

## Scenarios

### Requirement 1: Real-time Metrics
**Scenario: Happy path - Viewing active sessions**
* Given there are multiple active cashier sessions
* When the supervisor views the dashboard
* Then the system MUST display the current expected cash for each session
* And the system SHOULD update the totals automatically as new payments sync

**Scenario: Edge case - Offline supervisor**
* Given the supervisor's device loses internet connection
* When the supervisor views the dashboard
* Then the system MUST display the last known metrics
* And the system MUST show an "Offline - Data may be outdated" warning indicator

### Requirement 2: Force-closing Sessions
**Scenario: Happy path - Force closing**
* Given an active cashier session exists for a cashier who left early
* When the supervisor triggers the "Force Close" action on that session
* Then the system MUST terminate the session
* And the system MUST mark the session as "Closed by Supervisor"

**Scenario: Edge case - Closing a session that is actively syncing**
* Given a cashier session is currently uploading queued offline transactions
* When the supervisor attempts to force close the session
* Then the system MUST allow the pending transactions to finish syncing before fully closing
* And the system MUST prevent any new transactions from being added to the session
