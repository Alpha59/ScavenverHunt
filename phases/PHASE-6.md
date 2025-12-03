Below are 10 tickets for **Phase 6: Teams, Joining Hunts, and Judge Assignment**.

They assume Phases 1–5 are complete (auth, users, hunts, tasks, facets, basic owner console, and repositories for `Teams`, `TeamMemberships`, `JudgeAssignments`, and `Users`).

Each ticket is self-contained with sufficient detail for Codex to implement, test, and run the application.

---

### Ticket 6.1: Refine Team and Membership Data Model for Player/Judge Roles

**Title**
Refine Team and Membership Data Model for Player/Judge Roles

**Features**

* Clarify separation between team-level roles and hunt-level roles.
* Ensure `JudgeAssignments` is the canonical source of “judge” role.
* Document invariants:

  * Owner can be judge or player.
  * Judge cannot be a player (no team membership in that hunt).

**Description**
This ticket ensures the backend data model fully supports the required role logic: Owners, Judges, and Players. It clarifies that team membership indicates “player” status, while `JudgeAssignments` indicates “judge” status. A user cannot be both judge and player in the same hunt. The owner may be selected as judge, in which case they must not be on any team.

**Infrastructure**

* No new AWS resources.
* Possible minor schema evolution (adding attributes to existing items) handled in code only.

**Steps (guidance for Codex)**

1. In `packages/backend/src/domain/models.ts`, ensure clear definitions:

   * `TeamMembership` continues to represent *player* membership only.
   * `JudgeAssignment` represents hunt-level judge role.
2. Add or update a small “role invariants” section in documentation (e.g., `docs/domain-model.md` or `docs/hunt-configuration.md`), stating:

   * A user is considered a **Player** for a hunt if they have at least one `TeamMembership` in that hunt.
   * A user is considered a **Judge** for a hunt if there exists a `JudgeAssignment` for `(huntId, userId)`.
   * A user may be the owner, judge, player, or owner+judge, but never judge+player simultaneously for the same hunt.
3. In repositories where it makes sense, add helper methods or utilities:

   * `TeamMembershipsRepository.listMembershipsByHuntAndUser(huntId, userId)` (using GSI on userId if available, then filter by hunt).
   * `JudgeAssignmentsRepository.isJudge(huntId, userId)`.
4. Add comments in code where these invariants are enforced, to guide future development.

**Testing**

* `npm run build:backend` and `npm test` must pass.
* Add or update unit tests for new helper methods in repositories.

**Acceptance Criteria**

* Domain and documentation clearly state owner/judge/player semantics and invariants.
* Repository helper methods exist to check judge status and player membership.
* All existing tests pass and new tests for helpers succeed.
* Changes are committed.

---

### Ticket 6.2: Backend API – Join Hunt via Game Code and Player Registration

**Title**
Backend API – Join Hunt via Game Code and Player Registration

**Features**

* `POST /hunts/join` endpoint to join a hunt using `gameCode`.
* Enforce that hunt must be `active` (not draft/closed).
* Create or update user record and return hunt + user context.

**Description**
This ticket implements the primary entry point for players: joining a hunt by game code. An authenticated user supplies a `gameCode` and the backend resolves the hunt, verifies it is active, and registers the user as a participant (but not yet on a team). This sets up data needed for later team join/creation.

**Infrastructure**

* Uses existing Hunts, Users, and TeamMemberships tables and repositories.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add route `POST /hunts/join` in the backend API handler(s):

   * Require JWT auth via existing middleware.
   * Request body: `{ "gameCode": string }`.
2. Handler behavior:

   * Lookup hunt by `gameCode`. If not found, return 404.

     * If hunts are indexed only by `huntId`, add a repository method `getHuntByGameCode(gameCode)` that uses a GSI (if present) or a scan in dev; if GSI missing, adjust infra in a later ticket or note the scan.
   * Ensure `hunt.status === 'active'`; otherwise return 400 with an informative message.
   * Ensure user exists in `Users` table (use `/me` or `UsersRepository` to ensure a record).
   * Return payload including:

     * Hunt summary.
     * Basic user profile.
     * Whether the user is already in a team or assigned as judge (using helper methods from Ticket 6.1).
3. Do not create team membership here; team join/creation is handled by separate endpoints.
4. Add unit tests with mocked repositories:

   * Hunt not found.
   * Hunt not active.
   * Successful join flow.

**Testing**

* `npm run build:backend` and `npm test`.
* Infra: `npm run build:infra` and `cdk synth` to ensure any minor changes compile if you added a GSI in earlier phases.
* Manual test:

  * Deploy backend stack.
  * Create an active hunt with a known `gameCode`.
  * Call `POST /hunts/join` with valid token and gameCode; verify response.

**Acceptance Criteria**

* `POST /hunts/join` endpoint exists and resolves hunts by `gameCode`.
* Only active hunts can be joined; appropriate errors for non-active or invalid gameCode.
* Response provides hunt and user context.
* Tests and deployment succeed; changes are committed.

---

### Ticket 6.3: Backend API – Team Creation, Join, and Leave with Constraints

**Title**
Backend API – Team Creation, Join, and Leave with Constraints

**Features**

* Endpoints:

  * `POST /hunts/{huntId}/teams` (create team).
  * `POST /hunts/{huntId}/teams/{teamId}/join` (join team).
  * `POST /hunts/{huntId}/teams/{teamId}/leave` (leave team).
* Enforce min/max team size rules and allowSolo on the hunt.
* Prevent judge from joining a team.

**Description**
This ticket enables players to form or join teams within an active hunt. The backend enforces rules from the Hunt configuration: min/max team size and whether solo play is allowed. It also ensures that judges cannot be in a team and that each user can be in at most one team per hunt.

**Infrastructure**

* Uses `Hunts`, `Teams`, and `TeamMemberships` tables.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add routes:

   * `POST /hunts/{huntId}/teams` – create team and add creator as member (or captain).
   * `POST /hunts/{huntId}/teams/{teamId}/join` – user joins existing team.
   * `POST /hunts/{huntId}/teams/{teamId}/leave` – user leaves team.
2. Common logic for all three endpoints:

   * Require JWT auth.
   * Lookup hunt by `huntId`; ensure `status === 'active'`.
   * Use `JudgeAssignmentsRepository` to ensure user is not judge.
3. Create team:

   * Ensure user is not currently on a team for this hunt (using `TeamMembershipsRepository.listTeamsByUser` and filtering by `huntId`).
   * Create team via `TeamsRepository.createTeam(huntId, teamName)`.
   * Add membership via `TeamMembershipsRepository.addMember(teamId, userId, 'captain')`.
   * Enforce `minTeamSize` and `maxTeamSize` constraints as follows:

     * Creation is allowed as long as `allowSolo === true` or `minTeamSize > 1` but we treat the initial team as valid; actual enforcement on start/submit can be stricter later.
     * Ensure that membership does not exceed `maxTeamSize`.
4. Join team:

   * Ensure user is not already in any team in this hunt.
   * Count current team members; enforce `maxTeamSize`.
   * If `allowSolo === false` and team would become 1-person team, ensure that is not in conflict with rules (for now, allow joining if the team is created).
5. Leave team:

   * Ensure user is currently in that team (same hunt).
   * Remove membership.
   * If the leaving user was captain and others remain, either:

     * Promote another member to captain (simple approach: earliest join).
     * Or allow captain to leave only if team is empty after; document chosen behavior.
6. Add unit tests:

   * Creating a team when already on a team returns error.
   * Joining a full team returns error.
   * Judge cannot join or create a team.

**Testing**

* `npm run build:backend` and `npm test`.
* `npm run build:infra` and `cdk synth`.
* Deploy stack and run manual tests:

  * Create active hunt, join via game code, create team, join/leave team via API.

**Acceptance Criteria**

* Team creation, join, and leave endpoints exist and enforce constraints.
* Users cannot be in more than one team per hunt.
* Judges are prevented from team membership.
* All tests and deployments succeed; changes are committed.

---

### Ticket 6.4: Backend API – Judge Assignment and Role Transitions

**Title**
Backend API – Judge Assignment and Role Transitions

**Features**

* Endpoints for owners to manage judges:

  * `POST /hunts/{huntId}/judge` (set or change judge).
  * `DELETE /hunts/{huntId}/judge/{userId}` (remove judge).
* Enforce invariants: judge cannot be player, owner can be judge, judge must be a participant.

**Description**
This ticket implements judge assignment logic at the backend. The owner can assign a judge from the list of participants (including themselves), and that judge must not be in any team. If a player is promoted to judge, they must be removed from all teams in the hunt. Removing a judge reverts them to regular participant (without team by default; team assignment, if desired, is manual).

**Infrastructure**

* Uses `Hunts`, `TeamMemberships`, and `JudgeAssignments` tables.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add `POST /hunts/{huntId}/judge` endpoint:

   * Require JWT auth.
   * Body: `{ "userId": "<user-to-assign-as-judge>" }`.
   * Fetch hunt and ensure requesting user is the owner.
   * Prevent assigning judge if hunt is `closed`.
   * Ensure target `userId` exists in `Users` table.
   * Remove target `userId` from all teams in this hunt via `TeamMembershipsRepository`.
   * Create or upsert `JudgeAssignment` for `(huntId, userId)`.
2. Add `DELETE /hunts/{huntId}/judge/{userId}`:

   * Only owner can call.
   * Remove `JudgeAssignment`.
   * Do not automatically add them back into teams.
3. Enforce invariants in team-related endpoints (Ticket 6.3) using `JudgeAssignmentsRepository.isJudge`:

   * If `isJudge(huntId, userId) === true`, reject team creation/join or membership updates.
4. Add unit tests:

   * Assign judge when they are currently a player: memberships removed.
   * Cannot assign judge if caller is not owner.
   * Judge removal works and does not break other roles.

**Testing**

* `npm run build:backend` and `npm test`.
* Deploy backend stack and manual tests:

  * Create hunt with a team and multiple players.
  * Assign one player as judge; verify they are removed from team membership and `JudgeAssignments` is populated.
  * Try to join a team as judge; verify error.

**Acceptance Criteria**

* Judge assignment/removal endpoints exist and enforce invariants.
* Assigning judge from a team removes them from that team.
* Judge cannot be on a team; owner can be judge.
* Tests and deployment succeed; changes are committed.

---

### Ticket 6.5: Backend Player & Judge “My Hunts” Queries

**Title**
Backend Player & Judge “My Hunts” Queries

**Features**

* Endpoints to list hunts for current user by role:

  * `GET /me/hunts/owned`
  * `GET /me/hunts/playing`
  * `GET /me/hunts/judging`
* Provide summary objects for use in dashboards.

**Description**
This ticket exposes user-centric views of hunts based on their roles: owner, player, and judge. These endpoints underpin the frontend home/dashboard screens for each role.

**Infrastructure**

* Uses `Hunts`, `TeamMemberships`, and `JudgeAssignments` tables.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add `GET /me/hunts/owned`:

   * Use JWT for current user.
   * `HuntsRepository.listHuntsByOwner(userId)`.
   * Return array of hunt summaries (id, name, gameCode, status).
2. Add `GET /me/hunts/playing`:

   * Use `TeamMembershipsRepository.listTeamsByUser(userId)`; from those memberships, collect unique `huntId`s.
   * For each `huntId`, load `Hunt` and build a summary.
   * Optionally include `teamId` in summary for convenience.
3. Add `GET /me/hunts/judging`:

   * Use `JudgeAssignmentsRepository.listHuntsForJudge(userId)` (add method if needed).
   * For each `huntId`, load `Hunt` and build summary.
4. Optimize with batch reads where convenient, but correctness is more important than optimization for now.
5. Add unit tests for each endpoint using mocked repositories.

**Testing**

* `npm run build:backend` and `npm test`.
* Deploy backend stack.
* Manual:

  * For a test user that is owner, player, and judge across different hunts, call each endpoint and verify hunts are categorized correctly.

**Acceptance Criteria**

* `/me/hunts/owned`, `/me/hunts/playing`, and `/me/hunts/judging` exist and return correct lists.
* Responses include enough information to populate role-based dashboards.
* Tests and deployment succeed; changes are committed.

---

### Ticket 6.6: Frontend “Join Hunt” Screen and Basic Player Flow

**Title**
Frontend “Join Hunt” Screen and Basic Player Flow

**Features**

* “Join Hunt” screen where authenticated users enter a `gameCode`.
* Uses `POST /hunts/join` to validate and fetch hunt.
* Navigates user into a hunt-specific “lobby” with options to create or join a team.

**Description**
This ticket creates the main entry point for players in the frontend. A signed-in user can navigate to “Join Hunt”, enter a game code, and be taken to a player lobby for that hunt, which will guide them to team selection and later gameplay.

**Infrastructure**

* Uses `/hunts/join` endpoint from Ticket 6.2.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add “Join Hunt” entry point in the authenticated navigation:

   * Could be a button on the main home screen or a dedicated tab.
2. Implement `JoinHuntScreen`:

   * Input field for `gameCode`.
   * “Join” button.
   * On submit:

     * Call `POST /hunts/join` with `{ gameCode }`.
     * Handle error states (invalid code, inactive hunt).
     * On success, store returned hunt summary in local state and navigate to `PlayerHuntLobbyScreen` with `huntId`.
3. Implement `PlayerHuntLobbyScreen`:

   * For now, show basic information:

     * Hunt name and code.
     * Whether user is currently in a team or judge.
   * Provide buttons:

     * “Create a Team”
     * “Join a Team”
     * (These will be wired in subsequent tickets).
4. Ensure this flow works on web and mobile targets.

**Testing**

* Unit tests:

  * `JoinHuntScreen` – when API returns success, navigates to lobby with correct params.
  * Error handling – displays messages on 404/400.
* Manual:

  * Run `npm run dev:frontend`, sign in, join a hunt using a valid code, and verify navigation and displayed information.

**Acceptance Criteria**

* Authenticated users see a “Join Hunt” flow in the app.
* Valid game codes lead to a hunt-specific lobby; invalid or inactive hunts produce clear errors.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 6.7: Frontend Team Management UI for Players

**Title**
Frontend Team Management UI for Players

**Features**

* In the player hunt lobby, display list of teams and membership status.
* Allow user to create a team, join a team, and leave their current team.
* Reflect backend constraints (e.g., max team size, judge constraints).

**Description**
This ticket connects the frontend UI to the team endpoints. From the player lobby, users can browse teams, create new teams, join existing teams, and leave teams while respecting the server-side rules.

**Infrastructure**

* Uses `GET /hunts/{huntId}/teams` (add if missing), `POST /hunts/{huntId}/teams`, `POST /hunts/{huntId}/teams/{teamId}/join`, and `/leave`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Backend: if not already present, add `GET /hunts/{huntId}/teams` endpoint:

   * Auth required.
   * Return all teams for the hunt, plus optionally member counts.
2. Frontend `PlayerHuntLobbyScreen`:

   * On mount, call `GET /hunts/{huntId}/teams`.
   * Fetch current user’s team membership using `/me/hunts/playing` or a dedicated endpoint for membership in this hunt.
   * Display:

     * List of teams with name and member count.
     * Highlight team user belongs to (if any).
3. Add UI actions:

   * “Create Team”:

     * Show small form with team name.
     * Call `POST /hunts/{huntId}/teams`.
     * Refresh team list and membership state.
   * “Join Team”:

     * For team rows, show “Join” button if user not in a team.
     * Call `POST /hunts/{huntId}/teams/{teamId}/join`.
   * “Leave Team”:

     * If user is in a team, show “Leave Team” button.
     * Call `POST /hunts/{huntId}/teams/{teamId}/leave`.
4. Display backend errors (e.g., team full, already in a team, judge cannot join).

**Testing**

* Unit tests:

  * Mock API responses for team list and membership, verify UI updates.
  * Ensure “Create/Join/Leave” actions send correct requests.
* Manual:

  * Join hunt, view team list, create a team, join and leave teams, confirm backend state via API or console.

**Acceptance Criteria**

* Players can see teams for a hunt and their own team membership.
* Players can create/join/leave teams via UI, with constraints enforced and errors surfaced.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 6.8: Frontend Owner Judge Assignment Interface

**Title**
Frontend Owner Judge Assignment Interface

**Features**

* UI for owners to select and manage a judge for a hunt.
* Shows list of current participants and their statuses.
* Calls judge assignment/removal endpoints.

**Description**
This ticket gives owners a way to designate a judge in the UI. Owners can choose any participant (including themselves) who is not already judge and will see that player removed from teams upon assignment. They can also remove or change the judge.

**Infrastructure**

* Uses `POST /hunts/{huntId}/judge` and `DELETE /hunts/{huntId}/judge/{userId}` from Ticket 6.4.
* Requires a backend endpoint to list participants per hunt (players + possibly users known via `/hunts/join`); this can be implemented here.

**Steps (guidance for Codex)**

1. Backend addition (if absent):

   * `GET /hunts/{huntId}/participants`:

     * Owner-only endpoint.
     * Returns list of users who:

       * Are team members in this hunt (`TeamMemberships`).
       * Or are judge.
       * Or are the owner.
     * Include per-user flags: `isOwner`, `isJudge`, `isPlayer` (has team membership).
2. Frontend: in `HuntDetailScreen` (Owner view), add a “Judge” section in the Overview tab or a dedicated sub-screen:

   * Display current judge (if any) and their avatar/name.
   * “Change Judge” / “Assign Judge” button opens selection list.
3. Judge selection UI:

   * Fetch participants via `GET /hunts/{huntId}/participants`.
   * In selection list, disable or label users who are not eligible (e.g., show reason, though backend will also enforce).
   * On selecting a participant, call `POST /hunts/{huntId}/judge` with `{ userId }`.
   * Refresh participants and judge display.
4. Provide a “Remove Judge” button that calls `DELETE /hunts/{huntId}/judge/{userId}` and refreshes state.
5. Display errors from backend when assignment fails (e.g., hunt closed).

**Testing**

* Unit tests:

  * Mock participants endpoint and judge assignment/removal, verify UI calls correct endpoints.
* Manual:

  * As owner, join players to a hunt and create teams.
  * Use UI to assign a judge; confirm that player disappears from team membership (via team list).
  * Remove and switch judges; verify behavior.

**Acceptance Criteria**

* Owner can view and assign a judge for a hunt in the UI.
* Owner can remove or change judge.
* Players assigned as judge are no longer on teams.
* Frontend and backend behave consistently with role rules; builds/tests pass and changes are committed.

---

### Ticket 6.9: Frontend Role-Based Dashboards (Owner / Player / Judge)

**Title**
Frontend Role-Based Dashboards (Owner / Player / Judge)

**Features**

* Home/dashboard views tailored to the user’s roles.
* Sections for:

  * Hunts they own.
  * Hunts they are playing.
  * Hunts they are judging.
* Quick navigation into each hunt’s relevant screen.

**Description**
This ticket improves UX by giving users a consolidated home dashboard showing all their hunts grouped by role. It uses backend “my hunts” endpoints and provides navigation shortcuts to owner console, player lobbies, and judge views (the judging UI will be built in later phases).

**Infrastructure**

* Uses `/me/hunts/owned`, `/me/hunts/playing`, `/me/hunts/judging` from Ticket 6.5.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Implement `HomeDashboardScreen` (or extend an existing home screen) that:

   * On mount, calls the three endpoints in parallel (or sequentially).
   * Shows three sections or tabs: “Owner”, “Player”, “Judge”.
   * Each section lists hunts with status and minimal details.
2. Navigation behavior:

   * Selecting an *owned* hunt navigates to `HuntDetailScreen`.
   * Selecting a *playing* hunt navigates to `PlayerHuntLobbyScreen`.
   * Selecting a *judging* hunt will later navigate to judge UI; for now, navigate to a placeholder `JudgeHuntShellScreen` or to the hunt overview with appropriate label.
3. Integrate `HomeDashboardScreen` into the app’s main stack/tab structure, and ensure it respects auth context.
4. Handle loading and error states gracefully.

**Testing**

* Unit tests:

  * Mock the three endpoints and verify that hunts are categorized and rendered correctly.
  * Verify navigation parameters when a hunt is selected.
* Manual:

  * Create multiple hunts where the user is owner, player, and judge (in various combinations).
  * Confirm that each section contains the correct hunts and navigation works.

**Acceptance Criteria**

* Users see a dashboard grouping hunts by roles (owner, player, judge).
* Tapping on a hunt leads to an appropriate next screen.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 6.10: Phase 6 End-to-End Verification and Documentation

**Title**
Phase 6 End-to-End Verification and Documentation

**Features**

* Validate full join/team/judge lifecycle end-to-end across backend and frontend.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for player and judge flows.

**Description**
This ticket confirms that Phase 6 functionality is complete and behaves coherently from the user’s perspective: joining a hunt, forming teams, and assigning judges. Documentation will be updated to reflect the new behaviors and flows.

**Infrastructure**

* Uses deployed `AuthStack`, `DataStack`, `CoreStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. From root, run:

   * `npm run lint`
   * `npm test` (including integration tests)
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (and `AuthStack` if changed).
3. Set frontend environment variables (API base URL, Cognito settings) if not already configured.
4. Manual end-to-end scenario:

   * Sign in as User A and create/activate a hunt as owner.
   * Sign in as User B and join via game code; create/join a team.
   * Sign in as User C and join via game code; join the same or another team.
   * As owner (User A), assign User B as judge via UI:

     * Verify User B is removed from teams.
     * Verify User B sees the hunt under “Judging” dashboard section.
   * As User C, confirm they are still a player and team membership is intact.
   * Confirm dashboards show correct grouping for each user.
5. Documentation updates:

   * Add or update `docs/player-flow.md` describing:

     * Joining a hunt (game code).
     * Team creation/join/leave.
   * Add or update `docs/judge-flow.md` describing:

     * How owners assign judges.
     * Role constraints (judge vs player).
   * Update `README.md` to briefly mention Phase 6 capabilities and link to role-specific docs.

**Testing**

* All commands in step 1 must succeed.
* Manual scenario in step 4 behaves as described without errors.

**Acceptance Criteria**

* Join → team management → judge assignment flows work end-to-end for realistic multi-user scenarios.
* Backend enforces role invariants consistently; frontend surfaces appropriate UI and errors.
* All builds, tests, and CDK deploys succeed.
* Documentation clearly explains player and judge flows.
* Repository is clean (`git status` shows no uncommitted changes) and all changes are committed.

