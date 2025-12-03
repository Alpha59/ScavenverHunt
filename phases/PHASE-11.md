Below are **10 tickets for Phase 11: Cross-Platform UX & Navigation Polish**.

Assumptions for Codex:

* Frontend is React Native / Expo with Web support.
* Navigation uses React Navigation v6 (native-stack + bottom-tabs) or an equivalent Expo Router setup; where details differ, adapt patterns to the existing navigation solution.
* Existing screens already exist for Owner, Judge, and Player flows (e.g., Hunt lists, Hunt detail, JudgeHuntScreen, PlayerTaskBrowserScreen, HuntDashboardScreen, FavoritesAlbumScreen, RecapScreen, Settings/Profile, etc.).

Each ticket contains: **Title, Features, Description, Infrastructure, Testing, Acceptance Criteria** and can be executed independently.

---

### Ticket 11.1: Global Navigation Shell & Role-Aware Route Guard

**Title**
Global Navigation Shell & Role-Aware Route Guard

**Features**

* Centralized navigation shell with:

  * Auth stack (sign-in/registration).
  * Main app stack with bottom tabs / primary sections.
* Role-aware route guard:

  * Owner/Judge/Player-specific access to sections (per-hunt and globally).
* User role context available throughout the app.

**Description**
This ticket establishes a clear, consistent navigation hierarchy and central role-awareness. It ensures that the navigation container knows whether the current user is acting as Owner, Judge, or Player for a given hunt and hides or blocks inappropriate routes.

**Infrastructure**

* Frontend-only; no AWS changes.
* Uses existing auth and user profile APIs to infer roles.

**Steps (for Codex)**

1. Create or refine `AppNavigation` (e.g., `src/navigation/AppNavigation.tsx`):

   * Structure:

     * `AuthStack` (login, registration, onboarding).
     * `MainTabs` (Home, Hunts, Notifications, Settings, etc.).
     * Optionally, `HuntDetail` stack nested under Hunts.
2. Implement `UserRoleContext` (or extend existing context/store):

   * Stores:

     * Global user info.
     * Per-hunt role: `owner`, `judge`, `player`, or combinations where applicable (e.g., Owner + Judge).
   * Provide hooks:

     * `useUserRole()` for global info.
     * `useHuntRole(huntId)` for per-hunt.
3. Implement a role-aware route guard component:

   * For screens that require a specific role, wrap in `RoleGuard`:

     * Props: `allowedRoles: ('owner' | 'judge' | 'player')[]`, `huntId?`.
     * If role is not allowed:

       * Show a “Not authorized for this section” message, or redirect to a safe screen (e.g., Hunt Dashboard).
4. Integrate guard into navigation:

   * Judge screens guarded to `judge` or `owner` (if owner is acting as judge).
   * Owner admin screens guarded to `owner`.
   * Player-only screens guarded to `player` or team members.

**Testing**

* Unit/component tests:

  * For `RoleGuard`, mock contexts and assert that:

    * Allowed roles see children.
    * Disallowed roles are redirected or see an error message.
* Manual:

  * Sign in as different synthetic users (owner, judge, player) and verify routes/tabs correspond correctly.

**Acceptance Criteria**

* Navigation container is clearly structured into auth and main app areas.
* Role-based access control at navigation level hides or blocks screens for inappropriate roles.
* Screens relying on specific roles use `RoleGuard` (or equivalent) consistently.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.2: Role-Aware Tab Layout & Hunt-Specific Section Visibility

**Title**
Role-Aware Tab Layout & Hunt-Specific Section Visibility

**Features**

* Main tab bar shows only relevant sections for the current user.
* Within a selected hunt, secondary navigation reflects that user’s role (Owner, Judge, Player).
* Clear visual distinction between global and per-hunt sections.

**Description**
This ticket refines which tabs and sections are visible to each role, making navigation less cluttered and more intuitive. For example, Judge-only screens should not appear in a player-only context, and owner-specific admin tools should be hidden from judges and players.

**Infrastructure**

* Frontend-only.
* Uses `UserRoleContext` and `RoleGuard` from Ticket 11.1.

**Steps (for Codex)**

1. Main Tabs (global):

   * Example tabs: Home, My Hunts, Notifications, Settings.
   * Evaluate which tabs should appear for all users (e.g., Home, Settings) vs role-specific (e.g., “Owned Hunts” for owners).
   * Implement dynamic tab options driven by user roles (from `useUserRole`).
2. Hunt Detail Navigation:

   * For each hunt, define a consistent set of sections (e.g., Overview/Dashboard, Tasks, Judge, Admin, Recap, Album).
   * Based on `useHuntRole(huntId)`, show/hide:

     * Owner:

       * Overview, Admin, Dashboard, Recap, Album.
     * Judge:

       * Overview, Judge panel, Dashboard, Album.
     * Player:

       * Overview, Task Browser/Submissions, Dashboard, Album, Recap.
   * Implement a secondary tab or segmented control at the top of `HuntDetailScreen` that adjusts based on role.
3. Ensure navigation state is synchronized:

   * When role changes (e.g., Owner designates a Judge), ensure the next navigation mount reflects new visibility.

**Testing**

* Component tests:

  * For a mocked `HuntDetailScreen`, test layout for each role to confirm correct sections appear.
* Snapshot tests:

  * Capture snapshots for Owner, Judge, Player variants to detect unintended changes.
* Manual:

  * Use various roles/assignments and verify that irrelevant tabs/sections do not appear.

**Acceptance Criteria**

* Main tabs and hunt-specific sections adjust automatically based on user roles.
* No user sees actions or tabs that they cannot use.
* Snapshot tests reflect separate UI structures for Owner/Judge/Player.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.3: Responsive Layout Framework for Web (Breakpoints & Layout Components)

**Title**
Responsive Layout Framework for Web (Breakpoints & Layout Components

**Features**

* Central breakpoint system for responsive design (e.g., small, medium, large).
* Reusable layout primitives:

  * `ResponsiveContainer`, `ResponsiveGrid`, `SideBySideLayout`.
* Web layouts adapt gracefully from mobile-width to large desktop screens.

**Description**
This ticket introduces a small responsive layout framework for the web target. It defines breakpoints and reusable layout components so that subsequent screens can easily present multi-column layouts on large screens and single-column layouts on small screens.

**Infrastructure**

* Frontend-only; CSS-in-JS or style utility changes.
* No backend or AWS modifications.

**Steps (for Codex)**

1. Define breakpoints (e.g., in `src/theme/breakpoints.ts`):

   * `sm`: up to 600px.
   * `md`: 600–1024px.
   * `lg`: above 1024px.
2. Implement a hook `useBreakpoint()`:

   * Uses `Dimensions` or `useWindowDimensions` on native.
   * Uses `window.innerWidth` on web (guarded by platform check).
   * Returns `currentBreakpoint: 'sm' | 'md' | 'lg'`.
3. Create layout components:

   * `ResponsiveContainer`: handles max-width, padding, and centers content for larger screens.
   * `ResponsiveGrid`:

     * Props: `columnsSm`, `columnsMd`, `columnsLg`.
     * Arrange children into a grid using flexbox and gap values.
   * `SideBySideLayout`:

     * On `lg`: two columns (e.g., scoreboard + details).
     * On `sm`/`md`: stacked vertically.
4. Ensure all layout components work across web, iOS, and Android using React Native styles and platform-aware adjustments.

**Testing**

* Unit tests:

  * For `useBreakpoint`, mock different widths and assert returned breakpoints.
* Component tests:

  * Render `ResponsiveGrid` with sample children and verify correct column counts per breakpoint.
* Manual:

  * On web, resize browser and confirm layout dynamics with a test screen.

**Acceptance Criteria**

* Breakpoint system and layout primitives exist and are reusable.
* Layout components behave correctly across different widths (sm/md/lg).
* No regressions observed on mobile form factors.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.4: Responsive Hunt Dashboard & Scoreboard Layout

**Title**
Responsive Hunt Dashboard & Scoreboard Layout

**Features**

* Multi-column layout for scoreboard and stats on larger web screens.
* Single-column stacked layout on mobile-sized devices.
* Uses responsive layout components from Ticket 11.3.

**Description**
This ticket applies the responsive framework to the Hunt Dashboard and Scoreboard screen. It improves readability and usability on large web screens by placing scoreboard and statistics side by side, while preserving a simple stacked layout on smaller devices.

**Infrastructure**

* Frontend-only.
* Uses `ResponsiveContainer`, `SideBySideLayout`, and `ResponsiveGrid`.

**Steps (for Codex)**

1. Refactor `HuntDashboardScreen`:

   * Wrap top-level content in `ResponsiveContainer`.
   * Use `SideBySideLayout`:

     * Left: Scoreboard (team ranking list).
     * Right: Key stats (total submissions, acceptance rate, task highlights).
   * On `lg`, show side by side; `sm`/`md` stacked.
2. Within scoreboard and stats sections:

   * Consider using `ResponsiveGrid` for task stats table on large screens to display multiple attributes per row cleanly.
3. Ensure back button and status banner remain consistent across platforms and breakpoints.
4. Maintain consistent padding, spacing, and typography from the theme.

**Testing**

* Snapshot tests:

  * Capture layout for `sm`, `md`, and `lg` width mocks.
* Manual:

  * On web, resize browser window and validate:

    * Small width: scoreboard and stats stacked vertically.
    * Large width: side by side.
  * On mobile (iOS/Android), verify that layout remains intuitive and scroll behavior is smooth.

**Acceptance Criteria**

* Hunt Dashboard and Scoreboard display in a multi-column layout on large screens and stacked on smaller ones.
* No clipping, overlap, or layout breakage on any platform.
* Snapshot and manual checks confirm correct responsive behavior.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.5: Responsive Favorites Album & Judge View Layout

**Title**
Responsive Favorites Album & Judge View Layout

**Features**

* Responsive grid layout for the Favorites Album on web.
* Responsive layout for Judge view (media + metadata) with side-by-side presentation on large screens.
* Graceful stacking on mobile-sized screens.

**Description**
This ticket improves visual presentation of media-heavy screens. On web, favorite submissions and judge review cards should use flexible grids and side-by-side layouts, while mobile devices retain a simple vertical layout.

**Infrastructure**

* Frontend-only.
* Uses responsive primitives from Ticket 11.3.

**Steps (for Codex)**

1. `FavoritesAlbumScreen`:

   * Wrap content in `ResponsiveContainer`.
   * Use `ResponsiveGrid` for favorite submission thumbnails:

     * Example configuration: `columnsSm=2`, `columnsMd=3`, `columnsLg=4`.
   * Ensure image cards maintain consistent aspect ratios and spacing.
2. `JudgeHuntScreen` (Review tab):

   * For the active submission card:

     * Use `SideBySideLayout`:

       * Media on the left (image/video).
       * Task description, team, notes, and action controls (accept/reject/favorite) on the right for `lg`.
     * On `sm`/`md` breakpoints, stack media above metadata/actions.
3. Confirm swiping mechanisms still function correctly when layout changes.
4. Ensure that touchscreen interactions are not hindered by layout changes on tablets or large phones.

**Testing**

* Snapshot tests for Favorites Album and Judge view at various breakpoints.
* Manual:

  * On web, check that album grid adjusts column count appropriately when resizing.
  * Verify judge view is side by side on desktop and stacked on mobile.
  * Confirm that swipe gestures and buttons remain accessible and usable.

**Acceptance Criteria**

* Favorites Album uses a responsive grid that adapts to screen width.
* Judge view presents media and details side by side on large screens and stacked on smaller ones.
* UX for swiping and interacting with media is preserved across devices.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.6: Accessibility Pass – Labels, Roles, and Focus Management on Core Flows

**Title**
Accessibility Pass – Labels, Roles, and Focus Management on Core Flows

**Features**

* Add accessibility labels and roles to primary interactive elements.
* Ensure focus moves logically after navigation and key actions on web.
* Improve screen reader support for key screens (Hunt Dashboard, Task Browser, Judge view).

**Description**
This ticket improves accessibility for users relying on screen readers or keyboard navigation. It adds explicit labels and roles to buttons and landmarks, and ensures focus management is sensible when navigating between screens and modals.

**Infrastructure**

* Frontend-only.
* No backend changes.

**Steps (for Codex)**

1. Identify core flows for accessibility improvements:

   * Home / Hunt list.
   * Hunt Dashboard & Scoreboard.
   * Player Task Browser and Task Submit screens.
   * Judge swipe view.
   * Favorites Album.
2. For buttons and actionable components:

   * Add `accessibilityLabel` and `accessibilityRole="button"` (or appropriate roles, e.g., `tab`, `header`).
   * Provide descriptive labels (e.g., “Accept submission”, “Reject submission with comment”, “Open favorites album”).
3. For structuring content:

   * Use `accessibilityRole="header"` for screen titles and section headers when appropriate.
   * On web, ensure ARIA-equivalent semantics are applied through React Native Web semantics where possible.
4. Focus management:

   * When navigating to a new screen, ensure focus moves to the main heading or first interactive element (where supported).
   * For modal dialogs (e.g., confirmation modals), ensure that:

     * Focus moves into the modal on open.
     * Focus returns to a sensible element when modal closes.
5. Confirm that status banners (e.g., “Hunt closed”, error messages) are exposed to screen readers.

**Testing**

* Manual with screen reader:

  * iOS: VoiceOver.
  * Android: TalkBack.
  * Web: NVDA/VoiceOver where possible.
* Automated linting:

  * If using eslint plugins or accessibility tools, run them and ensure no new critical A11Y issues.

**Acceptance Criteria**

* Primary flows (Hunt list, Dashboard, Task Browser, Judge view, Album) have meaningful accessibility labels and roles.
* Screen reader can navigate through core flows with understandable context.
* Focus behavior is predictable for screen transitions and modals.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.7: Forms, Modals, and Action Feedback UX Polish

**Title**
Forms, Modals, and Action Feedback UX Polish

**Features**

* Consistent styling and behavior for forms (inputs, dropdowns, buttons).
* Standardized modal components with consistent headers, footers, and action buttons.
* Clear, non-intrusive feedback for long-running and completed actions (loading spinners, toasts).

**Description**
This ticket standardizes forms and modals throughout the app to improve UX consistency. It ensures users receive clear feedback when they perform actions such as activating a hunt, closing a hunt, submitting tasks, or judging submissions.

**Infrastructure**

* Frontend-only.
* No backend or AWS changes.

**Steps (for Codex)**

1. Create shared components:

   * `AppButton` (primary, secondary, destructive variants).
   * `AppTextInput` with label, helper text, and error state.
   * `AppModal` with standardized layout (title, content, primary/secondary actions).
   * `AppToast` or integrate with existing notification system for success/error messages.
2. Replace ad-hoc buttons/forms in:

   * Hunt creation/edit screens.
   * Activation/close confirmation dialogs.
   * Task submission form (notes, media attach).
   * Judge accept/reject with comment if a modal is used.
3. Provide consistent feedback patterns:

   * Show loading state on buttons while network calls are pending (disable button, show spinner).
   * On success, display short toast and optionally close modal.
   * On error, show clear error message and allow retry.

**Testing**

* Component tests:

  * Verify visual states (default, loading, error) for `AppButton` and `AppTextInput`.
  * Confirm `AppModal` renders actions correctly and invokes callbacks.
* Manual:

  * Walk through core flows and confirm:

    * Buttons indicate loading.
    * Forms show clear validation messages.
    * Modals feel consistent across features.

**Acceptance Criteria**

* Forms and modals across the app use shared UI components with consistent behavior.
* Users receive clear visual feedback for loading, success, and error states.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.8: Web Navigation & Back Behavior (History, Deep Linking, Refresh Safety)

**Title**
Web Navigation & Back Behavior (History, Deep Linking, Refresh Safety)

**Features**

* Proper browser history handling for navigation (back/forward buttons).
* Deep-link support for key routes (e.g., specific hunt, judge view, recap).
* Page refresh safety (reloading a route preserves context or gracefully re-loads).

**Description**
This ticket refines web navigation behavior, ensuring that the browser’s back/forward buttons behave correctly, deep links to specific hunts/screens work, and page refreshes do not lead to errors or blank screens.

**Infrastructure**

* Frontend-only.
* Uses React Navigation’s `linking` or equivalent Expo Router configuration.

**Steps (for Codex)**

1. Configure linking:

   * Define linking configuration mapping URLs to navigation routes, e.g.:

     * `/hunts/:id` → Hunt Detail screen.
     * `/hunts/:id/judge` → Judge view.
     * `/hunts/:id/recap` → Recap screen.
   * Implement in React Navigation `NavigationContainer` `linking` prop or Expo Router equivalents.
2. Ensure navigation state is derived correctly from the URL:

   * On initial load from URL, fetch required data (hunt data, role) and render the correct screen.
3. Back button behavior:

   * Validate that pressing browser back navigates to previous screens instead of closing the app or leaving it in an inconsistent state.
4. Refresh safety:

   * Ensure that if user refreshes on a deep-linked page:

     * App re-fetches necessary data (hunt, user role) on mount.
     * UI gracefully handles loading and errors.

**Testing**

* Manual on web:

  * Navigate across several screens, using:

    * In-app navigation.
    * Browser back/forward buttons.
  * Deep-link directly to `/hunts/:id`, `/hunts/:id/recap`, `/hunts/:id/judge`.
  * Refresh each of these URLs and confirm correct behavior.
* Automated:

  * If feasible, add minimal tests for linking config (route mappings) to avoid regressions.

**Acceptance Criteria**

* Browser back/forward navigation works naturally with app navigation.
* Direct navigation to key URLs loads correct screens and data.
* Page refreshes on any key route do not result in blank or error-only screens.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.9: Cross-Platform Styling Consistency (Theme, Typography, Spacing, Contrast)

**Title**
Cross-Platform Styling Consistency (Theme, Typography, Spacing, Contrast)

**Features**

* Centralized theme for colors, typography, and spacing.
* Consistent visual styling across iOS, Android, and Web.
* Basic contrast checks for primary text and interactive elements.

**Description**
This ticket unifies the visual style of the app. It defines a theme for colors, fonts, and spacing, and ensures that the app appears coherent across platforms, with adequate contrast for readability.

**Infrastructure**

* Frontend-only.
* No backend changes.

**Steps (for Codex)**

1. Define `theme` in a central module (e.g., `src/theme/theme.ts`):

   * Color palette:

     * Primary, secondary, background, surface, text, success, error, warning.
     * Ensure sufficient contrast between text and background for primary flows.
   * Typography:

     * Scales for headings (H1–H4), body, caption.
   * Spacing:

     * Standard spacing scale (`4, 8, 12, 16, 24, 32` etc.).
2. Wrap application in a `ThemeProvider` and/or provide `useTheme()` hook.
3. Update core screens and shared components to use theme tokens:

   * Buttons, headers, banners, cards, lists, forms.
4. Validate contrast:

   * For primary backgrounds and text, ensure approximate WCAG AA-level contrast where possible (e.g., dark text on light backgrounds or vice versa).

**Testing**

* Snapshot tests:

  * Capture key screens after theme integration to detect visual regressions.
* Manual:

  * Compare visual appearance across Android, iOS, and Web:

    * Verify consistent typography sizes and spacing relationships.
    * Ensure primary buttons and text are legible on backgrounds.

**Acceptance Criteria**

* A centralized theme is used throughout primary components and screens.
* Visual appearance is coherent and consistent across platforms.
* Primary text and interactive elements have sufficient contrast for typical displays.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 11.10: Phase 11 End-to-End UX Verification and Documentation

**Title**
Phase 11 End-to-End UX Verification and Documentation

**Features**

* End-to-end UX checks across roles and platforms (iOS, Android, Web).
* Verification of navigation, responsiveness, role-aware visibility, and accessibility basics.
* Documentation updates for navigation structure and UX guidelines.

**Description**
This ticket confirms that Phase 11 UX and navigation refinements are coherent across the entire app. It ensures owners, judges, and players have intuitive, role-aware navigation on all platforms and that the responsive and accessibility improvements behave as intended. It also updates documentation for future contributors.

**Infrastructure**

* Frontend-only.
* No additional AWS or backend changes.

**Steps (for Codex)**

1. Run full frontend checks:

   * `npm run lint`
   * `npm test`
   * `npm run web`
   * `npm run ios` (simulator)
   * `npm run android` (emulator)
2. Manual end-to-end flows:

   * iOS and Android:

     * Sign in as each role (Owner, Judge, Player).
     * Verify:

       * Tabs and in-hunt sections align with role.
       * Players cannot access owner/judge screens.
       * Hunt Dashboard, Task Browser, Judge view, Album, Recap all function as expected.
     * Confirm forms, modals, loading states, and toasts behave consistently.
   * Web:

     * Verify navigation and browser history behavior.
     * Resize browser (phone width, tablet width, desktop width) and confirm responsive layouts for Dashboard, Album, Judge view.
     * Confirm accessibility labels reasonably describe key actions (quick screen reader pass on at least one flow).
3. Documentation:

   * Add or update:

     * `docs/navigation-structure.md`:

       * Explain global navigation (Auth stack, Main tabs).
       * Describe role-aware hunt sections and guards.
     * `docs/ux-guidelines.md`:

       * Document responsive layout principles and breakpoints.
       * Summarize accessibility conventions (labels, focus behavior).
   * Update `README.md` with a short UX/Navigation overview and links to the above docs.

**Testing**

* All `npm` scripts in step 1 must succeed.
* Manual verification steps should complete without critical UX issues or navigation dead-ends.

**Acceptance Criteria**

* Navigation is coherent and role-aware on iOS, Android, and Web.
* Responsive layouts behave correctly on various web screen sizes.
* Basic accessibility support is present on main flows.
* Documentation clearly describes current navigation and UX patterns.
* Repository is clean and Phase 11 is complete.

