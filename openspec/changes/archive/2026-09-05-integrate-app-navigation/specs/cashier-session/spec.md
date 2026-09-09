# Delta for cashier-session

## ADDED Requirements

### Requirement: Active Session UI Exposure

The system MUST expose the current cashier's active profile and a session lock trigger to the global Top Bar.

#### Scenario: Displaying active profile

- GIVEN a cashier is authenticated with an active session
- WHEN the Top Bar is rendered
- THEN the Top Bar MUST display the cashier's name or profile indicator

#### Scenario: Locking the session

- GIVEN a cashier is authenticated with an active session
- WHEN the user taps the lock session trigger in the Top Bar
- THEN the system MUST end or lock the active session
- AND redirect the user to the PIN entry or login screen

### Requirement: Session Role Verification

The system MUST provide role evaluation capabilities from the active session for route guards.

#### Scenario: Exposing role for route guards

- GIVEN an active session exists
- WHEN a protected route (e.g., Supervisor) requests authorization
- THEN the cashier session MUST expose the role to determine access
