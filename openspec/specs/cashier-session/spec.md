# cashier-session

## Requirements
1. The system MUST enforce Front-of-House Cash Isolation (FCC) by tying all cash transactions to a specific active cashier session.
2. The system MUST require a starting float declaration before opening a cashier session.
3. The system MUST expose the current cashier's active profile and a session lock trigger to the global Top Bar.
4. The system MUST provide role evaluation capabilities from the active session for route guards.

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

### Requirement 3: Active Session UI Exposure
**Scenario: Displaying active profile**
* Given a cashier is authenticated with an active session
* When the Top Bar is rendered
* Then the Top Bar MUST display the cashier's name or profile indicator

**Scenario: Locking the session**
* Given a cashier is authenticated with an active session
* When the user taps the lock session trigger in the Top Bar
* Then the system MUST end or lock the active session
* And redirect the user to the PIN entry or login screen

### Requirement 4: Session Role Verification
**Scenario: Exposing role for route guards**
* Given an active session exists
* When a protected route (e.g., Supervisor) requests authorization
* Then the cashier session MUST expose the role to determine access
