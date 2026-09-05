# payment-recording

## Requirements
1. The system MUST enforce a 10-minute audit window for all recorded payments to allow corrections.
2. After the 10-minute audit window, payments MUST become immutable.

## Scenarios

### Requirement 1: 10-minute Audit Window
**Scenario: Happy path - Correcting a payment within the window**
* Given a payment was recorded 5 minutes ago
* When the cashier edits the payment amount
* Then the system MUST allow the correction
* And the system MUST log the reason for the change

**Scenario: Edge case - Reverting a deletion within the window**
* Given a payment was recorded 8 minutes ago and then mistakenly marked as deleted
* When the cashier undoes the deletion within the remaining 2 minutes
* Then the system MUST restore the payment to its active state

### Requirement 2: Immutability after window
**Scenario: Happy path - Attempting edit after window**
* Given a payment was recorded 15 minutes ago
* When the cashier attempts to edit the payment
* Then the system MUST disable the edit functionality for that payment
* And the system MUST indicate that the audit window has closed

**Scenario: Edge case - Offline sync delay**
* Given a payment was recorded offline and synced 20 minutes later
* When the server receives the delayed payment
* Then the server MUST accept the payment but immediately lock it from further edits
* And the audit window MUST be considered expired based on the original offline creation time
