# Delta for pwa-core

## ADDED Requirements

### Requirement: Sync Status Indicator

The system MUST expose the current online/offline and sync status to the global Top Bar.

#### Scenario: Online sync status

- GIVEN the application has an active internet connection
- WHEN the Top Bar is rendered
- THEN the Top Bar MUST display an indicator showing the app is online or synced

#### Scenario: Offline sync status

- GIVEN the application loses internet connection
- WHEN the Top Bar is rendered
- THEN the Top Bar MUST display an offline indicator
- AND the indicator SHOULD reflect if there is pending data to sync
