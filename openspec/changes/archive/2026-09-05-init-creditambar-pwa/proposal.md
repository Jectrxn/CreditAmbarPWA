# Proposal: CreditAmbar PWA Initiative

## Intent
Create "CreditAmbar PWA," an offline-first web application for managing customer credit ("fiados") in a fiambrería/minimarket. It addresses the need for reliable credit tracking in environments with unstable internet, providing a shared-device experience, robust roles (Cashier vs Supervisor), payment reconciliation, and a modern iOS Liquid Glass interface.

## Scope
### In-Scope
- **PWA Setup**: React, Vite, TypeScript, Tailwind CSS.
- **UI/UX**: iOS Liquid Glass design (frosted glass, translucent borders, backdrop blur).
- **Offline-First Storage**: IndexedDB integration for an offline sync queue that automatically synchronizes with Supabase.
- **Backend & Auth**: Supabase (PostgreSQL, Auth, Storage, Realtime).
- **Core Workflows**:
  - Flexible credit catalog with photographic evidence.
  - Shared device session with quick employee switching (optional PIN).
  - Customer and credit limit management (restricted to Supervisor/Jefe).
  - Payments and deposits tracking, separating cash (for petty cash balancing) and QR/digital wallets.
  - 10-minute grace period for immediate cashier corrections; supervisor authorization required afterward.
  - 1-tap WhatsApp integration to share balances.
  - Metrics dashboard for Supervisor/Jefe.

### Out-of-Scope
- Native iOS/Android app development (restricted to PWA).
- Full inventory management or POS system integration outside of the credit workflow.

## Capabilities
### New Capabilities
- `pwa-core`: Offline-first React/Vite progressive web app with IndexedDB sync queue.
- `liquid-glass-ui`: Shared UI components utilizing the iOS Liquid Glass design system.
- `credit-management`: Creation, viewing, and tracking of customer credit and photo evidence.
- `cashier-session`: Shared-device active store session with fast employee switching.
- `payment-recording`: Registration of payments distinguishing between cash and digital wallets, including grace period corrections.
- `supervisor-dashboard`: Analytics, user management, and authorization flows for managers.

### Modified Capabilities
- None.

## Technical Approach
1. **Foundation**: Initialize a Vite + React + TypeScript repository configured as a PWA. Implement Tailwind CSS for the Liquid Glass UI.
2. **Database & Sync**: Configure Supabase for backend services. Set up Dexie.js or native IndexedDB for local caching and offline mutation queues. Implement an auto-sync service.
3. **Authentication**: Build a shared-device auth flow where the device logs in once, and employees switch active context using a quick selector and PIN.
4. **Features**: Develop modules for credit transactions (with image upload to Supabase Storage), payment reconciliation, and the supervisor dashboard.
5. **Business Logic**: Enforce the 10-minute correction window on the client and server. Build the WhatsApp sharing link generator based on customer balance.
