Below are 10 tickets for **Phase 1: Basic Application Creation & Monorepo Setup**.
They are ordered; each ticket assumes prior tickets have been completed, but each one includes enough information and concrete steps for Codex to complete it autonomously and verify success.

---

### Ticket 1: Initialize Git Repository and Root Node Workspace

**Title**
Initialize Git Repository and Root Node Workspace

**Features**

* Create a new Git repository for the Scavenger Hunt application.
* Initialize a root Node.js project with npm workspaces.
* Define high-level workspace structure for `packages/frontend`, `packages/backend`, and `packages/infra`.

**Description**
This ticket creates the foundational repository and Node.js workspace that all subsequent work will use. Codex will initialize a Git repository, configure a root `package.json` with npm workspaces, and create empty directories for each package. No application logic is implemented yet; the focus is repository layout and basic Node configuration.

**Infrastructure**

* No cloud infrastructure created or modified.
* Local filesystem only.

**Steps (guidance for Codex)**

1. Initialize Git:

   * Run `git init` in the project root.
2. Create a root `package.json` configured for npm workspaces:

   * `name`: `"scavenger-hunt-monorepo"`
   * `private`: `true`
   * `workspaces`: `["packages/*"]`
   * Add basic scripts (can be refined later):

     * `"test": "echo \"No tests yet\" && exit 0"`
     * `"build": "echo \"No build yet\" && exit 0"`
3. Create directories:

   * `packages/frontend/`
   * `packages/backend/`
   * `packages/infra/`
4. Add a minimal `README.md` at the root describing the project at a one-paragraph level.
5. Stage and commit changes with a message such as:

   * `chore: initialize monorepo workspace`

**Testing**

* Run `npm install` at the root to ensure the root `package.json` is valid and npm workspaces are recognized (even though no packages are defined yet).
* Run `npm test` to verify the placeholder script executes successfully.

**Acceptance Criteria**

* Git repository exists and has an initial commit with the workspace structure.
* Root `package.json` is valid, marked `private: true`, and defines `workspaces: ["packages/*"]`.
* Directories `packages/frontend`, `packages/backend`, and `packages/infra` exist.
* `npm install` completes successfully at the root.
* `npm test` runs and exits with code 0 using the placeholder script.

---

### Ticket 2: Add Base Configuration Files and Ignore Rules

**Title**
Add Base Configuration Files and Ignore Rules

**Features**

* Add `.gitignore` for Node/TypeScript/Expo projects.
* Add optional `.editorconfig` for basic editor consistency.
* Ensure node_modules and build artifacts are ignored.

**Description**
This ticket adds standard configuration and ignore files needed to keep the repository clean and consistent across environments. It prevents committing dependencies or build artifacts and provides consistent indentation and line endings.

**Infrastructure**

* No cloud resources.
* Local repository configuration only.

**Steps (guidance for Codex)**

1. Create `.gitignore` at the repository root with at least:

   * `node_modules/`
   * `*.log`
   * `.DS_Store`
   * `dist/`
   * `build/`
   * `.expo/`
   * `.expo-shared/`
   * `.idea/`, `.vscode/`
   * `coverage/`
2. Optionally add `.gitignore` in sub-packages only if strictly necessary; otherwise root file should suffice.
3. Create `.editorconfig` at the root with basic settings, e.g.:

   * `root = true`
   * `[*]`

     * `charset = utf-8`
     * `end_of_line = lf`
     * `insert_final_newline = true`
     * `indent_style = space`
     * `indent_size = 2`
4. Stage and commit configuration files with a message such as:

   * `chore: add base gitignore and editorconfig`

**Testing**

* No automated tests required.
* Verify that calling `git status` does not show `node_modules` or other known ignored directories after an `npm install`.

**Acceptance Criteria**

* `.gitignore` exists at the root and ignores Node, Expo, and build artifacts.
* `.editorconfig` exists at the root with consistent formatting rules.
* Running `npm install` and then `git status` shows no unwanted tracked files from `node_modules` or build artifacts.
* Changes are committed to the repository.

---

### Ticket 3: Configure Base TypeScript for Monorepo

**Title**
Configure Base TypeScript for Monorepo

**Features**

* Add a shared base TypeScript configuration at the root.
* Add per-package `tsconfig.json` files referencing the base config.
* Enable strict TypeScript settings.

**Description**
This ticket defines TypeScript settings for the entire monorepo. A root `tsconfig.base.json` will hold shared compiler options, and each package will have its own `tsconfig.json` that extends this base. This ensures consistent type checking across the frontend, backend, and infra packages.

**Infrastructure**

* No cloud infrastructure.
* Local TypeScript configuration only.

**Steps (guidance for Codex)**

1. At the root, add `tsconfig.base.json` with contents similar to:

   * `"compilerOptions"`:

     * `"target": "ES2020"`
     * `"module": "commonjs"` or appropriate for Node
     * `"moduleResolution": "node"`
     * `"strict": true`
     * `"esModuleInterop": true`
     * `"skipLibCheck": true`
     * `"forceConsistentCasingInFileNames": true`
     * `"resolveJsonModule": true`
     * `"noImplicitAny": true`
2. In `packages/backend/`, create `tsconfig.json` extending the base:

   * `"extends": "../../tsconfig.base.json"`
   * `"compilerOptions.outDir": "dist"`
   * `"include": ["src"]`
   * `"exclude": ["node_modules", "dist"]`
3. Repeat step 2 for:

   * `packages/frontend/tsconfig.json`
   * `packages/infra/tsconfig.json`
     (Adjust `outDir` or `jsx` settings later as needed; for now keep them simple and compilable.)
4. Ensure each package has a `src/` directory, even if empty for now.
5. Stage and commit with message such as:

   * `chore: add base TypeScript configuration and per-package tsconfig`

**Testing**

* Run `npx tsc -b` or `npx tsc --build` at the root (if using project references) or run `npx tsc` inside each package to ensure the `tsconfig` files parse correctly and produce no compilation errors (empty projects will compile).
* Ensure the build completes with exit code 0.

**Acceptance Criteria**

* `tsconfig.base.json` exists at the repository root with strict TypeScript options.
* Each package (`frontend`, `backend`, `infra`) has a `tsconfig.json` extending the base.
* Running TypeScript compilation (per package or monorepo-wide) succeeds without errors.
* Changes are committed to the repository.

---

### Ticket 4: Set Up ESLint and Prettier for All Packages

**Title**
Set Up ESLint and Prettier for All Packages

**Features**

* Configure ESLint in the monorepo with TypeScript support.
* Configure Prettier for formatting.
* Add root-level scripts for linting and formatting.

**Description**
This ticket introduces static analysis and formatting. Codex will configure ESLint with TypeScript/React rules and Prettier for formatting. The configuration should be shared across packages, with the ability to extend or override per package if needed. Root npm scripts will orchestrate linting for all workspaces.

**Infrastructure**

* No cloud infrastructure.
* Local linting and formatting configuration only.

**Steps (guidance for Codex)**

1. At the root, install dev dependencies (version ranges are acceptable):

   * `eslint`
   * `@typescript-eslint/parser`
   * `@typescript-eslint/eslint-plugin`
   * `eslint-plugin-import`
   * `eslint-plugin-react`
   * `eslint-plugin-react-hooks`
   * `prettier`
   * `eslint-config-prettier`
2. Create a root ESLint config (e.g., `.eslintrc.cjs` or `.eslintrc.json`) with:

   * Parser: `@typescript-eslint/parser`
   * Plugins: `@typescript-eslint`, `react`, `react-hooks`, `import`
   * Extends: e.g., `["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react/recommended", "plugin:react-hooks/recommended", "plugin:import/recommended", "plugin:import/typescript", "prettier"]`
   * Set `"root": true`.
   * Include basic `env` for browser, node, es2020.
3. Add a basic `.prettierrc` at the root with:

   * `"singleQuote": true`
   * `"trailingComma": "all"`
   * `"printWidth": 100`
   * `"semi": true`
4. Update root `package.json` scripts to include:

   * `"lint": "eslint . --ext .ts,.tsx"`
   * `"format": "prettier --write ."`
5. Ensure ESLint respects TypeScript and React in `packages/frontend/` and TypeScript/Node in `packages/backend/` and `packages/infra/`.
6. Stage and commit with message such as:

   * `chore: configure eslint and prettier`

**Testing**

* Run `npm run lint` at the root and ensure it passes (there may be no code yet; if warnings appear, adjust configuration or add placeholder code to satisfy rules).
* Run `npm run format` to ensure Prettier executes successfully.

**Acceptance Criteria**

* ESLint configuration file exists at the root and supports TypeScript and React.
* Prettier configuration file exists at the root.
* `npm run lint` passes without errors.
* `npm run format` runs successfully.
* Changes are committed to the repository.

---

### Ticket 5: Scaffold Backend Package with Minimal Health Endpoint

**Title**
Scaffold Backend Package with Minimal Health Endpoint

**Features**

* Initialize `packages/backend` as a Node.js/TypeScript package.
* Implement a minimal HTTP server with a `/health` endpoint returning JSON.
* Add build and start scripts for the backend.

**Description**
This ticket creates the backend package and a simple HTTP service that can run locally. It does not yet integrate with AWS. The service exposes a single `/health` endpoint that returns a JSON payload indicating the backend is running. This will later be replaced or wrapped by Lambda handlers, but for Phase 1 the focus is local development.

**Infrastructure**

* No cloud infrastructure.
* Local Node.js HTTP server only (e.g., using Express or Node’s `http` module).

**Steps (guidance for Codex)**

1. In `packages/backend/`, create a `package.json` with:

   * `name`: `"backend"`
   * `main`: `"dist/index.js"`
   * `scripts`:

     * `"build": "tsc -p tsconfig.json"`
     * `"start": "node dist/index.js"`
     * `"dev": "ts-node-dev --respawn --transpile-only src/index.ts"` (or similar)
     * `"test": "jest"` (to be wired in a later ticket)
   * Add `dependencies`:

     * `express` (or another simple HTTP framework; choose one and use it consistently)
   * Add `devDependencies`:

     * `ts-node-dev` (or equivalent dev runner)
2. Ensure `tsconfig.json` in backend (created earlier) is compatible with Node execution (e.g., `"module": "commonjs"`).
3. Create `src/index.ts` implementing:

   * An Express app listening on a configurable port (default 4000).
   * A `GET /health` route returning JSON like:

     * `{ "status": "ok", "service": "backend", "timestamp": <ISO string> }`
4. Update root `package.json` to add helper scripts:

   * `"dev:backend": "npm run dev --workspace backend"`
   * `"build:backend": "npm run build --workspace backend"`
5. Stage and commit changes with message such as:

   * `feat: add backend package with health endpoint`

**Testing**

* From the project root:

  * Run `npm run build:backend` and ensure it completes successfully.
  * Run `npm run dev:backend` and verify the server starts without error.
* Using a local HTTP client (curl or Node’s `http`), make a request to `http://localhost:4000/health` and confirm a 200 response with the expected JSON structure.

**Acceptance Criteria**

* `packages/backend` has a valid `package.json` and `tsconfig.json`.
* `src/index.ts` starts an HTTP server exposing `GET /health`.
* `npm run build:backend` succeeds.
* `npm run dev:backend` starts the server, and `/health` responds correctly.
* All changes are committed.

---

### Ticket 6: Scaffold Infra Package with Minimal CDK App Shell

**Title**
Scaffold Infra Package with Minimal CDK App Shell

**Features**

* Initialize `packages/infra` as a CDK TypeScript app.
* Add a placeholder CDK stack with no resources.
* Configure build and synth scripts.

**Description**
This ticket sets up the infrastructure package where all future AWS resources will be defined. For Phase 1, it only contains a minimal CDK app with an empty stack to validate CDK configuration and synthesis.

**Infrastructure**

* No AWS resources deployed yet.
* Only CDK constructs and synthesis.

**Steps (guidance for Codex)**

1. In `packages/infra/`, create `package.json` with:

   * `name`: `"infra"`
   * `main`: `"dist/app.js"`
   * `scripts`:

     * `"build": "tsc -p tsconfig.json"`
     * `"cdk:synth": "cdk synth"`
     * `"cdk:list": "cdk list"`
   * `dependencies`:

     * `aws-cdk-lib`
     * `constructs`
   * `devDependencies`:

     * `typescript` (can rely on root if already installed at workspace, but ensure compatibility)
2. Create `bin/app.ts` (CDK entrypoint) that initializes an `App` and a simple stack, e.g., `CoreStack`:

   * `const app = new cdk.App();`
   * `new CoreStack(app, 'ScavengerHuntCoreStack');`
3. Create `lib/core-stack.ts` defining an empty stack that extends `cdk.Stack` without adding resources yet.
4. Ensure `tsconfig.json` in `packages/infra` includes both `bin` and `lib` directories.
5. Update root `package.json` scripts to include:

   * `"build:infra": "npm run build --workspace infra"`
   * `"cdk:synth": "npm run cdk:synth --workspace infra"`
6. Stage and commit changes with message such as:

   * `chore: scaffold infra package with empty cdk app`

**Testing**

* From the project root:

  * Run `npm run build:infra` to compile the CDK app.
  * Run `npm run cdk:synth` and confirm a CloudFormation template is synthesized without errors.
* Confirm that `cdk list` shows `ScavengerHuntCoreStack` (or chosen name).

**Acceptance Criteria**

* `packages/infra` contains a working CDK TypeScript app with a placeholder stack.
* `npm run build:infra` succeeds.
* `npm run cdk:synth` generates a template without errors.
* No AWS resources are deployed yet.
* Changes are committed.

---

### Ticket 7: Scaffold Frontend Package with Expo React Native App

**Title**
Scaffold Frontend Package with Expo React Native App

**Features**

* Initialize an Expo React Native app inside `packages/frontend`.
* Configure TypeScript for Expo.
* Ensure the app can run on Web and at least one native platform (simulator/emulator).

**Description**
This ticket creates the cross-platform frontend application using Expo. Codex will scaffold a standard Expo TypeScript template within `packages/frontend`, adapt it to the monorepo, and verify that it runs on the web and at least one native target.

**Infrastructure**

* No cloud infrastructure.
* Local Expo development server.

**Steps (guidance for Codex)**

1. In the project root, use `npx create-expo-app` or equivalent to initialize the app **directly into** `packages/frontend` (or move it afterward):

   * Example: `npx create-expo-app packages/frontend --template expo-template-blank-typescript`
   * If tooling does not allow direct path, create then move contents into `packages/frontend`.
2. Ensure `packages/frontend/package.json` is compatible with the workspace (no conflicting `name` with other packages).
3. Verify `tsconfig.json` for frontend either uses Expo template or extends `../../tsconfig.base.json` as appropriate (adjust to avoid conflicts but keep strict mode).
4. Update root `package.json` with scripts:

   * `"dev:frontend": "npm run start --workspace frontend"`
5. From the project root, run:

   * `npm run dev:frontend`
   * Confirm the Expo DevTools UI appears and that the app loads on Web via Expo (e.g., pressing `w` or using the browser link).
   * Codex should also validate at least one native target (iOS simulator or Android emulator), but if not possible, ensure the configuration supports it.
6. Stage and commit with message such as:

   * `feat: add frontend expo app`

**Testing**

* Run `npm run dev:frontend` and open the app in the web browser; confirm basic default screen renders.
* Ensure no TypeScript compilation errors during Expo startup.
* Optionally, run `npm test` if Expo template added default tests and ensure they pass.

**Acceptance Criteria**

* `packages/frontend` contains a valid Expo React Native TypeScript app.
* Running `npm run dev:frontend` starts the Expo dev server successfully.
* The app loads on the web and shows the default Expo template screen (or a minimal “Scavenger Hunt” placeholder title).
* No TypeScript configuration errors occur.
* Changes are committed.

---

### Ticket 8: Configure Jest Testing for Backend, Frontend, and Infra

**Title**
Configure Jest Testing for Backend, Frontend, and Infra

**Features**

* Set up Jest at the root with TypeScript support.
* Add minimal Jest configuration for each package.
* Add at least one trivial test per package.

**Description**
This ticket adds a unified testing framework using Jest. Codex will configure Jest to work with TypeScript and create a tiny test in each package to verify everything compiles and runs. This prepares the repository for real unit tests in later phases.

**Infrastructure**

* No cloud infrastructure.
* Local testing configuration.

**Steps (guidance for Codex)**

1. Install Jest and TypeScript support as dev dependencies at the root:

   * `jest`
   * `ts-jest`
   * `@types/jest`
2. Create a root Jest configuration file (`jest.config.cjs` or `jest.config.ts`) that:

   * Uses `ts-jest` as the transformer.
   * Sets `testEnvironment` to `"node"` for backend/infra.
   * Includes a mechanism to target tests in all packages, e.g.:

     * `roots: ["<rootDir>/packages"]`
3. Optionally create per-package Jest configs that extend the root (not strictly required if root config handles all).
4. In `packages/backend/src/__tests__/health.test.ts`, add a trivial test that:

   * Imports a simple function (or directly tests a constant) and asserts a value.
   * If necessary, factor out the health handler logic into a testable function.
5. In `packages/frontend/`, add a simple test file (e.g., `App.test.tsx`) that:

   * Renders the root component with a test renderer or simply asserts a dummy condition if full React Native testing is not yet configured.
6. In `packages/infra/`, add a simple test (e.g., `core-stack.test.ts`) that imports the stack class and asserts it can be instantiated.
7. Update root `package.json` to set:

   * `"test": "jest"`
8. Run `npm test` from the root and ensure all tests pass.
9. Stage and commit with message such as:

   * `chore: configure jest and add smoke tests in all packages`

**Testing**

* Run `npm test` at the root and verify:

  * Jest starts.
  * All three package test suites run.
  * All tests pass with exit code 0.

**Acceptance Criteria**

* Jest is configured at the root and operates over all packages.
* Each package has at least one passing test.
* `npm test` at the root runs successfully.
* Changes are committed.

---

### Ticket 9: Wire Root Build and Dev Scripts for All Packages

**Title**
Wire Root Build and Dev Scripts for All Packages

**Features**

* Add root-level scripts to build and run each package.
* Standardize package-level scripts (`build`, `test`, `lint` where applicable).
* Ensure monorepo operations can be executed via root commands.

**Description**
This ticket unifies how the monorepo is operated. Codex will ensure each package has the necessary scripts and wire root scripts that delegate to workspaces. This improves developer ergonomics and prepares Codex for later automation.

**Infrastructure**

* No cloud infrastructure.
* Local npm workspace configuration only.

**Steps (guidance for Codex)**

1. Ensure each package has at least the following scripts in its `package.json`:

   * `backend`:

     * `"build": "tsc -p tsconfig.json"`
     * `"dev": "ts-node-dev --respawn --transpile-only src/index.ts"`
     * `"test": "jest"` (Jest will pick tests via root config)
   * `frontend`:

     * `"start": "expo start"`
     * `"test": "jest"` (if configured)
     * `"build": "expo build:web"` or placeholder if not yet used
   * `infra`:

     * `"build": "tsc -p tsconfig.json"`
     * `"cdk:synth": "cdk synth"`
2. At the root `package.json`, add scripts for combined operations:

   * `"build:backend": "npm run build --workspace backend"`
   * `"build:frontend": "npm run build --workspace frontend"`
   * `"build:infra": "npm run build --workspace infra"`
   * `"dev:backend": "npm run dev --workspace backend"`
   * `"dev:frontend": "npm run start --workspace frontend"`
   * `"lint": "eslint . --ext .ts,.tsx"` (already added earlier)
   * `"test": "jest"` (already configured)
   * Optionally `"build:all": "npm run build:backend && npm run build:infra"` (excluding frontend if not ready for production build).
3. Confirm `npm run build:backend`, `npm run build:infra`, and `npm run dev:frontend` all work from the root.
4. Stage and commit with message such as:

   * `chore: add root build and dev scripts for all packages`

**Testing**

* Run from the root:

  * `npm run build:backend`
  * `npm run build:infra`
  * `npm run dev:backend` (terminate after verifying startup)
  * `npm run dev:frontend` (terminate after verifying startup)
* Run `npm test` to confirm tests still pass.

**Acceptance Criteria**

* All packages expose consistent `build`/`dev`/`test` scripts.
* Root scripts are present and correctly delegate to each workspace.
* Back-end and infra builds run successfully from the root.
* Frontend dev server starts successfully from the root.
* Tests still pass.
* Changes are committed.

---

### Ticket 10: Phase 1 Integration Verification and Documentation Update

**Title**
Phase 1 Integration Verification and Documentation Update

**Features**

* Verify end-to-end Phase 1 setup for backend, frontend, and infra (local only).
* Update `README.md` and/or `docs/architecture.md` to describe Phase 1 state.
* Ensure all scripts and instructions are accurate.

**Description**
This ticket validates that Phase 1 is complete and the repository is usable as a baseline. Codex will run through all key commands (build, test, dev servers) and update documentation to reflect how to start and work with the project. This forms the foundation for later phases.

**Infrastructure**

* No AWS deployment yet.
* Local verification of all components.

**Steps (guidance for Codex)**

1. From the root, run:

   * `npm install` (if not already done recently).
   * `npm run lint`.
   * `npm test`.
   * `npm run build:backend`.
   * `npm run build:infra`.
   * `npm run dev:backend` and validate `/health` locally (`http://localhost:4000/health`).
   * `npm run dev:frontend` and validate the app loads in the browser.
2. Update `README.md` to include:

   * Project overview.
   * Requirements (Node version, npm).
   * Setup instructions (`npm install`).
   * How to run backend locally (`npm run dev:backend`).
   * How to run frontend locally (`npm run dev:frontend`).
   * How to run tests and linting.
3. If `docs/architecture.md` exists or a `docs/` directory is present, add a short section describing the Phase 1 architecture (monorepo structure, packages, and their purposes).
4. Ensure there are no uncommitted changes besides documentation and minor fixes.
5. Commit with a message such as:

   * `chore: validate phase 1 integration and update docs`

**Testing**

* All commands in step 1 must complete successfully.
* Manual verification:

  * Backend health endpoint returns expected JSON.
  * Frontend root screen renders without TypeScript errors in the console.

**Acceptance Criteria**

* `npm run lint`, `npm test`, `npm run build:backend`, `npm run build:infra` all succeed.
* `npm run dev:backend` and `npm run dev:frontend` both start successfully, and manual checks confirm they behave as expected.
* `README.md` contains clear instructions to set up and run the project.
* Optional `docs/architecture.md` describes Phase 1 architecture at a high level.
* All changes are committed, and the repository is in a clean state (`git status` shows no uncommitted changes).

