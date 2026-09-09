# app-navigation Specification

## Purpose

Defines the core application shell navigation, including a unified Top Bar, a mobile-first Tab Bar, and route-level guards for navigating between main application areas.

## Requirements

### Requirement: Global Shell Layout

The system MUST assemble a global layout featuring a sticky Top Bar and a fixed Bottom Tab Bar.

#### Scenario: Shell assembly on launch

- GIVEN the application is loaded
- WHEN the user views the main interface
- THEN the layout MUST display the Top Bar anchored to the top
- AND the Tab Bar MUST be anchored to the bottom
- AND the active route content MUST render between them

### Requirement: Tab Navigation Routes

The system MUST provide navigation between four core routes: Caja, Clientes, Historial, and Supervisor.

#### Scenario: Navigating between tabs

- GIVEN the user is on the "Caja" tab
- WHEN the user taps the "Clientes" tab
- THEN the URL MUST update to the Clientes route
- AND the Clientes content MUST render in the main view area
- AND the "Clientes" tab MUST show an active state

### Requirement: Role-Based Route Guards

The system MUST restrict access to the Supervisor tab based on the active cashier's role.

#### Scenario: Authorized access to Supervisor

- GIVEN an active session exists for a user with the "Supervisor" role
- WHEN the user taps the "Supervisor" tab
- THEN the system MUST render the Supervisor dashboard

#### Scenario: Unauthorized access to Supervisor

- GIVEN an active session exists for a user with the "Cashier" role
- WHEN the user attempts to access the "Supervisor" route
- THEN the system MUST prevent access to the content
- AND the system SHOULD redirect the user to a default authorized route or hide the tab
