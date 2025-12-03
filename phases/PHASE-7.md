Below are 10 tickets for **Phase 7: Media Submission, Judging Workflow, Scoring & Dashboards**.

Assumptions:

* Phases 1–6 are complete (auth, users, hunts, tasks, facets, teams, judges, basic dashboards, DynamoDB repositories including `SubmissionsRepository` and `TeamScoresRepository`).
* Backend is Lambda + API Gateway, infra via CDK, frontend is React Native / Expo + web.

Each ticket has: **Title, Features, Description, Infrastructure, Testing, Acceptance Criteria** and is self-contained.

---

### Ticket 7.1: MediaStack – S3 Bucket for Submissions and Backend Wiring

**Title**
MediaStack – S3 Bucket for Submissions and Backend Wiring

**Features**

* New `MediaStack` with S3 bucket for storing photos/videos.
* Server-side encryption and basic lifecycle policy.
* Environment variables and IAM permissions for backend Lambdas.

**Description**
This ticket introduces persistent storage for media files attached to submissions. Codex will define an S3 bucket dedicated to submission media, wire its name and region into backend Lambdas, and grant appropriate read/write permissions. Clients will upload via pre-signed URLs rather than direct AWS credentials.

**Infrastructure**

* New `MediaStack` in `packages/infra/lib/media-stack.ts`:

  * S3 bucket: e.g., `scavenger-hunt-submissions-<env>`.
  * Properties:

    * Block public access (use pre-signed URLs only).
    * Server-side encryption (SSE-S3).
    * Optional lifecycle rule (e.g., transition to infrequent access after N days; optional delete after a long retention period).
* `CfnOutput`:

  * `SubmissionsMediaBucketName`.
* In `bin/app.ts`:

  * Instantiate `MediaStack` with same `env` as other stacks.
* In `CoreStack`:

  * Take `MediaStack` instance as a prop or otherwise reference `mediaStack.bucket`.
  * For relevant backend Lambdas:

    * `addEnvironment("MEDIA_BUCKET_NAME", mediaBucket.bucketName)`.
    * `mediaBucket.grantReadWrite(lambdaFn)`.

**Testing**

* From root:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy MediaStack`
* Verify in AWS console:

  * S3 bucket exists with encryption enabled.
  * Public access is blocked.

**Acceptance Criteria**

* `MediaStack` exists with a dedicated submissions S3 bucket.
* Backend Lambdas have `MEDIA_BUCKET_NAME` environment variable and read/write IAM permissions.
* Synth and deploy commands succeed; changes are committed.

---

### Ticket 7.2: Backend – Create Submission & Pre-Signed Media Upload Workflow

**Title**
Backend – Create Submission & Pre-Signed Media Upload Workflow

**Features**

* Endpoint to initiate a submission and issue a pre-signed URL:

  * `POST /hunts/{huntId}/tasks/{taskId}/submissions`
* Stores submission metadata in DynamoDB with `status = 'pending'` and upload token.
* Enforces rules: hunt active, user is player on a team, task completion rules (per-team limits, repeatability).

**Description**
This ticket implements the core submission creation flow. A player selects a task, requests a submission, and receives both a submission record and a pre-signed URL to upload a photo/video. The backend ensures the user is part of a team for the hunt, the hunt is active, and basic completion rules are respected.

**Infrastructure**

* Uses `Submissions` table, `TeamMemberships`, `Tasks`, `Hunts`, `TeamScores` (later), and S3 bucket from `MediaStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add `POST /hunts/{huntId}/tasks/{taskId}/submissions` route:

   * Auth required (JWT).
   * Body may include:

     * `mediaType: 'image' | 'video'`
     * `notes?: string`.
2. Handler logic:

   * Validate hunt and task:

     * `HuntsRepository.getHuntById(huntId)`; ensure `status === 'active'`.
     * `TasksRepository.getTaskById(taskId)`; ensure it belongs to `huntId`.
   * Determine team:

     * Use `TeamMembershipsRepository.listTeamsByUser(userId)` and filter by `huntId` to find user’s team; if none, return 400 (must be on a team or allowed individual play if design requires it; choose and document behavior).
   * Enforce task completion rules:

     * Check existing submissions for this `(huntId, taskId, teamId)` using `SubmissionsRepository`:

       * If `task.maxCompletionsPerTeam` is set and already reached with `accepted` submissions, reject with 400.
       * If `task.maxTeamsCanComplete` is set and the count of distinct teams with `accepted` submissions for this task has reached that limit, reject with 400.
   * Generate `submissionId` (UUID).
   * Generate S3 key, e.g.: `hunts/{huntId}/teams/{teamId}/tasks/{taskId}/{submissionId}` with extension based on `mediaType`.
   * Use AWS SDK S3 client to create a pre-signed PUT URL.
   * Create `Submission` record in DynamoDB via `SubmissionsRepository.createSubmission`:

     * `status = 'pending'`.
     * `mediaUrl` as the final S3 key (not the pre-signed URL).
     * `submittedByUserId`, `teamId`, `huntId`, `taskId`, `notes`.
   * Return:

     * `submission` object (without internal secrets).
     * `uploadUrl` (pre-signed URL).
3. Add unit tests:

   * Successful creation and pre-signed URL generation.
   * Error when hunt not active.
   * Error when user not in team.
   * Error when maxCompletions/maxTeams rules violated.

**Testing**

* `npm run build:backend`
* `npm test` including new tests.
* After backend deploy:

  * Manually call endpoint with a valid token and verify:

    * S3 pre-signed URL works for uploading media using curl or an HTTP client.
    * Submission record appears in `Submissions` table.

**Acceptance Criteria**

* Players can initiate new submissions and receive pre-signed URLs.
* Hunt status, team membership, and basic completion rules are enforced.
* Submissions are stored in DynamoDB with `pending` status and proper metadata.
* Tests and deploy succeed; changes are committed.

---

### Ticket 7.3: Backend – Judge Review, Accept/Reject, Favorite & Scoring Updates

**Title**
Backend – Judge Review, Accept/Reject, Favorite & Scoring Updates

**Features**

* Endpoints for judge review and filtering:

  * `GET /hunts/{huntId}/submissions` (query params: `status`, `teamId`, `taskId`, `sort`, `cursor`).
  * `POST /hunts/{huntId}/submissions/{submissionId}/decision` for accept/reject with optional comment and favorite flag.
* Update `Submissions` and `TeamScores` accordingly.
* Enforce judge role and idempotency (no double counting points).

**Description**
This ticket implements the judging backend: judges can browse submissions, accept or reject them with an optional comment, and flag favorites (hearts). When a judge accepts a submission, points are awarded to the team and totals are updated in `TeamScores`. The API supports filtering/sorting and is structured to support the swipe interface in frontend.

**Infrastructure**

* Uses `Submissions`, `TeamScores`, `JudgeAssignments`, `Tasks`, `Teams`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. `GET /hunts/{huntId}/submissions`:

   * Auth required; ensure user is judge for that hunt.
   * Query parameters:

     * `status` (`pending|accepted|rejected`, default `pending`).
     * Optional `teamId`, `taskId`.
     * Optional `sort` (e.g., `submittedAt`, with direction).
     * Optional pagination token.
   * Use `SubmissionsRepository` methods and GSIs to fetch filtered submissions.
   * Return submissions plus pagination token.
2. `POST /hunts/{huntId}/submissions/{submissionId}/decision`:

   * Auth required; ensure user is judge.
   * Body:

     * `decision: 'accept' | 'reject'`
     * `comment?: string`
     * `favorite?: boolean`
   * Handler:

     * Load submission; ensure `submission.huntId === huntId`.
     * If `decision === 'accept'`:

       * If submission already `accepted`, do nothing to scores (idempotent).
       * Set `status = 'accepted'`, `judgedByUserId`, `judgedAt`, `judgeComment`, `isFavorite = favorite`, `awardedPoints = task.points` by default.
       * Call `TeamScoresRepository.upsertTeamScore(huntId, teamId, +points)` only if status changed from non-accepted to accepted.
     * If `decision === 'reject'`:

       * If submission previously `accepted`, do **not** retroactively remove points unless you explicitly support that; simplest is to disallow changing from accepted to rejected and return 409.
       * Set `status = 'rejected'`, `judgedByUserId`, `judgedAt`, `judgeComment`, `isFavorite = favorite || false`, `awardedPoints = 0`.
   * Return updated submission.
3. Add unit tests:

   * Accept path: status transitions and score updates.
   * Reject path: status transitions without score updates.
   * Idempotent accept (no double scoring).
   * Non-judge cannot access these endpoints.

**Testing**

* `npm run build:backend` and `npm test`.
* After deploy:

  * Create test submissions and as judge use the endpoints to accept/reject; verify:

    * Submissions reflect correct status/metadata.
    * `TeamScores` table totals increase appropriately on first accept.

**Acceptance Criteria**

* Judges can list and filter submissions and issue accept/reject decisions with optional comments and favorite flag.
* Score updates are accurate and idempotent.
* Non-judges are blocked from these endpoints.
* Tests and deploy succeed; changes are committed.

---

### Ticket 7.4: Backend – Scoreboard & Task Statistics Endpoints

**Title**
Backend – Scoreboard & Task Statistics Endpoints

**Features**

* `GET /hunts/{huntId}/scoreboard` – team scores and rankings.
* `GET /hunts/{huntId}/stats` – per-task and global statistics (submissions, acceptance rate).
* Accessible to all participants (owner, judge, players).

**Description**
This ticket surfaces scoring and statistics to the frontend. It aggregates `TeamScores` and `Submissions` to provide a leaderboard and key stats such as number of submissions per task, accepted counts, and per-team totals.

**Infrastructure**

* Uses `TeamScores` and `Submissions` (and `Teams`, `Tasks` for enrichment).
* No new AWS resources.

**Steps (guidance for Codex)**

1. `GET /hunts/{huntId}/scoreboard`:

   * Auth required; ensure user is associated with the hunt (owner, judge, or player).
   * Retrieve all `TeamScore` records for hunt.
   * Join with `Teams` to get team names.
   * Return sorted list (descending `totalPoints`), plus rank.
2. `GET /hunts/{huntId}/stats`:

   * Auth required; same access rules as scoreboard.
   * For each task:

     * Count total submissions, accepted, rejected, pending (via `SubmissionsRepository`, potentially GSI by `taskId` or scanning under `huntId`).
   * For hunt-level aggregates:

     * Total submissions, overall acceptance rate, total points awarded.
   * Return structured data:

     * `tasks: [{ taskId, title, totalSubmissions, accepted, rejected, pending }]`
     * `summary: { totalSubmissions, totalAccepted, totalRejected, totalPending, totalPointsAwarded }`.
3. Implement repository helper functions for efficient aggregation where possible; correctness is more important than optimal performance.
4. Add unit tests for handlers with mocked repos.

**Testing**

* `npm run build:backend` and `npm test`.
* After deploy:

  * With seeded data, call these endpoints and verify:

    * Scoreboard ordering matches expected totals.
    * Stats counts match actual submissions in DynamoDB.

**Acceptance Criteria**

* Scoreboard endpoint returns ranked team scores.
* Stats endpoint returns meaningful per-task and overall stats.
* Access is restricted to hunt participants.
* Tests and deploy succeed; changes are committed.

---

### Ticket 7.5: Frontend – Player Task Browser & Submission Flow (Capture/Upload)

**Title**
Frontend – Player Task Browser & Submission Flow (Capture/Upload)

**Features**

* Player view to browse/search/filter/sort tasks for a hunt.
* Ability to select a task, capture or pick media, and initiate submission.
* Handles pre-signed URL upload and shows progress / completion.

**Description**
This ticket connects the player UI to the submission backend. Within a joined hunt, players can browse tasks, tap one, capture or select a photo/video, request a submission, upload via the pre-signed URL, and see a confirmation that their submission is pending judgment.

**Infrastructure**

* Uses `GET /hunts/{huntId}/tasks` (from Phase 5) and `POST /hunts/{huntId}/tasks/{taskId}/submissions` from Ticket 7.2.
* Uses S3 pre-signed URLs from backend for upload.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `PlayerHuntLobbyScreen`, add navigation into a `PlayerTaskBrowserScreen`.
2. `PlayerTaskBrowserScreen`:

   * On mount, fetch tasks via `GET /hunts/{huntId}/tasks`.
   * Provide:

     * Text search by title/description.
     * Filters based on tags and facets (if easy; at minimum, show tags and facet labels).
     * Sorting (e.g., by points or name).
   * List tasks with key information (title, points, tags).
3. When user selects a task:

   * Navigate to `TaskSubmitScreen` with `huntId` and `taskId`.
4. `TaskSubmitScreen`:

   * Use Expo APIs to:

     * Choose between “Take Photo/Video” or “Upload from Gallery”.
     * Get local URI for the media.
   * Optional text field for `notes`.
   * On “Submit”:

     * Call `POST /hunts/{huntId}/tasks/{taskId}/submissions` with `mediaType` and `notes`.
     * Receive `uploadUrl` + `submission` from backend.
     * Upload file to `uploadUrl` using `fetch` with PUT, correct `Content-Type`.
     * Handle upload progress (if feasible) and errors.
     * After upload success, show a success state indicating submission is pending review.
5. Ensure UI works on web and mobile; use appropriate fallbacks for media capture on web (file input) vs mobile (camera).

**Testing**

* Unit/UI tests:

  * Mock tasks API and verify filter/search behavior.
  * Mock submission API and upload call; confirm that flow calls backend and handles success/failure states.
* Manual:

  * Join hunt as a player.
  * Browse tasks, submit a photo or video, confirm submission appears in database and status is pending.

**Acceptance Criteria**

* Players can browse tasks for a hunt with basic search/filter.
* Players can capture/pick media, create a submission, and upload to S3 via pre-signed URL.
* User receives clear feedback that submission is pending judgment.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 7.6: Frontend – Player Submission History & Status View

**Title**
Frontend – Player Submission History & Status View

**Features**

* View for players to see their team’s submissions for a hunt.
* Shows status (`pending`, `accepted`, `rejected`), points, judge comments, and media thumbnail.
* Allows basic filtering by task and status.

**Description**
This ticket gives players visibility into how their submissions are performing. For a given hunt, they can see all submissions from their team, whether they were accepted or rejected, any judge comments, and which ones contributed to their score.

**Infrastructure**

* Uses a new or existing endpoint:

  * `GET /hunts/{huntId}/teams/{teamId}/submissions` (implement if missing).
* No new AWS resources.

**Steps (guidance for Codex)**

1. Backend:

   * Add `GET /hunts/{huntId}/teams/{teamId}/submissions`:

     * Auth required.
     * Ensure user is either:

       * Member of the team, or
       * Owner or judge (for full visibility).
     * Use `SubmissionsRepository` to list submissions for `(huntId, teamId)` and join with tasks to get titles.
   * Support optional query params: `status`, `taskId`.
2. Frontend:

   * In the player hunt flow, add a “My Team Submissions” or “Submissions” entry.
   * Implement `PlayerSubmissionsScreen`:

     * On mount, resolve `teamId` for current user in this hunt (from local state or via a small membership endpoint).
     * Call `GET /hunts/{huntId}/teams/{teamId}/submissions`.
     * Display list with:

       * Thumbnail (if easily constructed from media URL; for now, at least a generic icon and media type).
       * Task title.
       * Status and awarded points.
       * Judge comment (if present).
       * Submission time.
     * Provide filters for status and task.
3. Loading and error handling as usual.

**Testing**

* Backend:

  * `npm run build:backend` and `npm test` with handler tests.
* Frontend:

  * Unit tests mocking submissions endpoint.
* Manual:

  * After creating and judging submissions, verify that players can see accurate history and statuses.

**Acceptance Criteria**

* Backend endpoint lists submissions per team in a hunt with appropriate access controls.
* Players can see their team’s submissions and statuses in the UI.
* Filters by status/task work as expected.
* Builds/tests/pass; changes are committed.

---

### Ticket 7.7: Frontend – Judge Swipe Interface & Review History

**Title**
Frontend – Judge Swipe Interface & Review History

**Features**

* Judge swipe interface (Tinder-like) showing one submission at a time (media, task, notes).
* Swipe left/right or tap buttons to reject/accept with optional comment/favorite.
* History view for judges to review past decisions and adjust favorites.

**Description**
This ticket implements the primary judge UX. Judges see pending submissions as a swipable stack and can quickly accept/reject, optionally adding comments and favorites. A separate list view allows them to review accepted/rejected items.

**Infrastructure**

* Uses:

  * `GET /hunts/{huntId}/submissions?status=pending` (for feed).
  * `POST /hunts/{huntId}/submissions/{submissionId}/decision` for decisions.
  * Same GET with `status=accepted|rejected` for history.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In judge role flow (from dashboard), add `JudgeHuntScreen` for a given `huntId`.
2. `JudgeHuntScreen`:

   * Tabs or segmented controls:

     * `Review` (swipe)
     * `History`
3. Review tab:

   * On mount, fetch pending submissions for hunt.
   * Use a card/stack component (e.g., gesture-based stack) showing:

     * Media preview (image or video still; for web/mobile use appropriate components).
     * Task title/description.
     * Submitting team name and notes.
   * Controls:

     * Swipe right or “Accept” button.
     * Swipe left or “Reject” button.
     * Optional “Favorite” toggle and comment input before decision.
   * On decision:

     * Call `POST /hunts/{huntId}/submissions/{submissionId}/decision`.
     * Remove submission from the current stack and move to next.
4. History tab:

   * Allow toggling between `accepted` and `rejected`.
   * Use `GET /hunts/{huntId}/submissions?status=accepted` (or `rejected`) to list decisions.
   * Show same metadata and favorite status.
   * Allow judge to toggle favorite on existing decisions (reusing decision endpoint with no status change if backend supports it; otherwise add a dedicated favorite endpoint).
5. Handle loading/state carefully to keep UX smooth.

**Testing**

* Unit/UI tests:

  * Mock submission list and decision endpoints.
  * Verify that swiping or pressing buttons triggers correct calls and updates local list.
* Manual:

  * As judge, review multiple pending submissions, accept/reject, and confirm scoreboard updates (from Ticket 7.4).
  * Verify history lists matched decisions and favorites.

**Acceptance Criteria**

* Judges have a swipable interface for reviewing pending submissions.
* Decisions are sent to backend and reflected in UI state.
* History tab shows accepted/rejected submissions and favorite status.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 7.8: Frontend – Shared Scoreboard & Hunt Dashboard Screen

**Title**
Frontend – Shared Scoreboard & Hunt Dashboard Screen

**Features**

* Hunt-specific scoreboard visible to all participants.
* Statistics view showing submission counts and acceptance rates.
* Navigation entry from owner, player, and judge flows.

**Description**
This ticket visualizes the scoreboard and statistics endpoints in the app. For any active or closed hunt, participants can see the current standings and basic metrics, supporting excitement and transparency during the game.

**Infrastructure**

* Uses:

  * `GET /hunts/{huntId}/scoreboard`
  * `GET /hunts/{huntId}/stats`
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add a `HuntDashboardScreen` used by all roles:

   * Accessed from:

     * Owner `HuntDetailScreen`.
     * Player `PlayerHuntLobbyScreen`.
     * Judge `JudgeHuntScreen`.
2. On mount, call:

   * `GET /hunts/{huntId}/scoreboard`.
   * `GET /hunts/{huntId}/stats`.
3. UI:

   * Scoreboard section:

     * Table or list of teams with rank, name, total points.
     * Highlight current user’s team where applicable.
   * Stats section:

     * Summary: total submissions, accepted, rejected, pending, total points awarded.
     * Per-task stats table (task name, accepted, pending, etc.).
4. Add basic pull-to-refresh or refresh button.
5. Handle loading/error states.

**Testing**

* Unit tests:

  * Mock scoreboard and stats endpoints and verify UI renders correct rankings and counts.
* Manual:

  * After playing and judging submissions, verify scoreboard shows correct ordering and stats match expectations.

**Acceptance Criteria**

* Participants can access a hunt dashboard showing scoreboard and stats.
* UI correctly highlights the user’s team.
* Data is consistent with backend endpoints.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 7.9: Favorites Photo Album – Backend & Frontend

**Title**
Favorites Photo Album – Backend & Frontend

**Features**

* Endpoint to list favorite submissions (judge “hearts”) for a hunt:

  * `GET /hunts/{huntId}/favorites`
* Frontend “Album” screen visible to all participants.
* Grid-style gallery of favorite media items.

**Description**
This ticket implements the “photo album” concept: judges can heart submissions; these favorites are compiled into an album that all players can see. This acts as a highlight reel for the game.

**Infrastructure**

* Uses `Submissions` table, where `isFavorite = true`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Backend:

   * Ensure `Submissions` model includes `isFavorite?: boolean`.
   * In decision endpoint (Ticket 7.3), ensure `favorite` presence sets `isFavorite` accordingly.
   * Add `GET /hunts/{huntId}/favorites`:

     * Auth required for any participant.
     * Query `Submissions` for `huntId` where `isFavorite = true` and `status = 'accepted'`.
     * Join with `Tasks` and `Teams` to include task titles and team names.
2. Frontend:

   * Add “Album” entry in hunt navigation (for owner, players, judges).
   * Implement `FavoritesAlbumScreen`:

     * Fetch data from `GET /hunts/{huntId}/favorites`.
     * Render grid or masonry-like layout of media thumbnails.
     * On tap, open a full-screen viewer showing:

       * Image/video.
       * Task title.
       * Team name.
       * Judge comment.
3. Support both image and video thumbnails; for simplicity, use the same component with overlay icons to indicate media type.

**Testing**

* Backend:

  * `npm run build:backend` and `npm test` for the favorites endpoint.
* Frontend:

  * Unit tests mocking favorites endpoint.
* Manual:

  * As judge, heart some accepted submissions.
  * As player, open album and verify favorites appear correctly.

**Acceptance Criteria**

* Backend exposes a favorites endpoint that aggregates accepted, hearted submissions.
* Frontend shows a gallery/album for favorites accessible to all participants.
* Album content matches judge favorites in backend.
* Builds/tests pass; changes are committed.

---

### Ticket 7.10: Phase 7 End-to-End Verification and Documentation

**Title**
Phase 7 End-to-End Verification and Documentation

**Features**

* Validate full flow: player submissions, media upload, judge review, scoring, scoreboard, album.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for submission and judging workflows.

**Description**
This ticket confirms Phase 7 is complete and coherent. It validates that media submission, judging, scoring, dashboards, and the favorites album work together for realistic game scenarios. It also updates documentation for future maintenance and further phases.

**Infrastructure**

* Uses deployed `AuthStack`, `DataStack`, `MediaStack`, `CoreStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. From the root, run:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy MediaStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack`
   * (`AuthStack` only if changed.)
3. Configure frontend environment variables (API base URL, Cognito, etc.).
4. Manual E2E scenario:

   * User A (Owner):

     * Creates and activates a hunt, configures tasks.
   * User B and C (Players):

     * Join via game code, form teams.
     * Browse tasks, capture/upload photo/video submissions for various tasks.
   * User D (Judge, assigned by Owner):

     * Uses swipe UI to accept/reject submissions, heart favorites, and add comments.
     * Confirms scoreboard updates as they accept.
   * All:

     * View hunt dashboard scoreboard and stats.
     * View favorites album with hearted submissions.
5. Documentation:

   * Add or update:

     * `docs/submission-flow.md` describing:

       * Pre-signed URLs, S3 usage.
       * Submission lifecycle (`pending → accepted/rejected`).
     * `docs/judging-flow.md` extended for decision and favorite behavior.
     * `docs/scoreboard-and-stats.md` summarizing scoring and dashboards.
   * Update `README.md` with a brief section summarizing Phase 7 capabilities and linking to detailed docs.

**Testing**

* All build/test commands in step 1 succeed.
* Manual scenario in step 4 behaves as expected without errors.

**Acceptance Criteria**

* Players can submit media, judges can review and score, scoreboard and stats update correctly, and favorites album works end-to-end.
* All builds, tests, and CDK deploys succeed.
* Documentation clearly describes submission, judging, and scoring workflows.
* Repository is clean with all changes committed.

