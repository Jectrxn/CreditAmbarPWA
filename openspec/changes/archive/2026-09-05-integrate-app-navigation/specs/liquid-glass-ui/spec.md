# Delta for liquid-glass-ui

## ADDED Requirements

### Requirement: Liquid Glass Navigation Shell

The Top Bar and Bottom Tab Bar components MUST implement the Liquid Glass design system.

#### Scenario: Navigation shell rendering

- GIVEN the application layout is loaded
- WHEN the Top Bar and Tab Bar are displayed
- THEN both components MUST feature a translucent background with a blur effect
- AND the content scrolling behind them MUST remain partially visible but out of focus

#### Scenario: Performance fallback on low-end devices

- GIVEN the user is on a device that does not support backdrop-filter or has low performance
- WHEN the Top Bar and Tab Bar are rendered
- THEN the components MUST fallback to a semi-transparent or solid background
- AND the navigation items MUST remain legible
