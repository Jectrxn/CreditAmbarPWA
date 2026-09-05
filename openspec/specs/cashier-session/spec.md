# cashier-session

## Requirements
1. The system MUST enforce Front-of-House Cash Isolation (FCC) by tying all cash transactions to a specific active cashier session.
2. The system MUST require a starting float declaration before opening a cashier session.

## Scenarios

### Requirement 1: FCC Cash Isolation
**Scenario: Happy path - Recording cash to a session**
* Given an active cashier session exists for "Cashier A"
* When "Cashier A" processes a cash payment
* Then the payment MUST be irrevocably linked to "Cashier A"'s current session
* And the session's expected cash total MUST increment by the payment amount

**Scenario: Edge case - Payment with no active session**
* Given no active cashier session exists
* When a user attempts to process a cash payment
* Then the system MUST block the transaction
* And the system MUST prompt the user to open a session first

### Requirement 2: Starting Float Declaration
**Scenario: Happy path - Opening session with float**
* Given a cashier is authenticated
* When the cashier initiates a new session and declares a starting float of $50
* Then the system MUST open the session
* And the session's base cash amount MUST be recorded as $50

**Scenario: Edge case - Negative float**
* Given a cashier is authenticated
* When the cashier initiates a new session and attempts to declare a starting float of -$10
* Then the system MUST reject the float declaration
* And the system MUST require a positive or zero float value to proceed
