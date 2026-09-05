# pwa-core

## Requirements
1. The system MUST operate seamlessly in an offline environment (Offline-first approach).
2. The system MUST allow authentication using a shared phone and unique PIN for each user.

## Scenarios

### Requirement 1: Offline-first
**Scenario: Happy path - Saving data offline**
* Given the user is disconnected from the internet
* When the user performs an action that saves data
* Then the data MUST be saved locally
* And the data MUST sync automatically when connection is restored

**Scenario: Edge case - App reload while offline**
* Given the user is disconnected from the internet
* When the user reloads the PWA
* Then the application MUST load successfully from the service worker cache
* And all previously saved local data MUST remain accessible

### Requirement 2: Shared Phone PIN
**Scenario: Happy path - Login with PIN**
* Given the app is installed on a shared phone
* When a user selects their profile and enters their correct 4-digit PIN
* Then the system MUST grant access to their specific session

**Scenario: Edge case - Incorrect PIN entry limit**
* Given the app is installed on a shared phone
* When a user attempts to log in with an incorrect PIN 3 consecutive times
* Then the system MUST lock the profile for 5 minutes
* And the system MUST display an error message
