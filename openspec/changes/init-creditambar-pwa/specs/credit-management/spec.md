# credit-management

## Requirements
1. The system MUST allow creation of new credit accounts for verified customers.
2. The system SHALL prevent exceeding the maximum credit limit for any account.

## Scenarios

### Requirement 1: Account Creation
**Scenario: Happy path - New customer creation**
* Given a verified customer profile exists
* When the supervisor creates a new credit account
* Then the system MUST initialize the account with a zero balance
* And the system MUST assign the default credit limit

**Scenario: Edge case - Duplicate account**
* Given a verified customer already has an active credit account
* When the supervisor attempts to create another credit account for the same customer
* Then the system MUST reject the creation
* And the system MUST display a "Customer already has an active account" error

### Requirement 2: Credit Limit Enforcement
**Scenario: Happy path - Valid credit purchase**
* Given a customer with a $100 available credit limit
* When the customer attempts to make a $50 purchase on credit
* Then the system MUST approve the transaction
* And the available limit MUST be updated to $50

**Scenario: Edge case - Exceeding limit**
* Given a customer with a $100 available credit limit
* When the customer attempts to make a $150 purchase on credit
* Then the system SHALL reject the transaction
* And the system MUST notify the user of the insufficient limit
