const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

export const tableConfig = {
  usersTableName: () => requireEnv('USERS_TABLE_NAME'),
  huntsTableName: () => requireEnv('HUNTS_TABLE_NAME'),
  tasksTableName: () => requireEnv('TASKS_TABLE_NAME'),
  teamsTableName: () => requireEnv('TEAMS_TABLE_NAME'),
  teamMembershipsTableName: () => requireEnv('TEAM_MEMBERSHIPS_TABLE_NAME'),
  judgeAssignmentsTableName: () => requireEnv('JUDGE_ASSIGNMENTS_TABLE_NAME'),
  submissionsTableName: () => requireEnv('SUBMISSIONS_TABLE_NAME'),
  teamScoresTableName: () => requireEnv('TEAM_SCORES_TABLE_NAME'),
};

export const optionalEnv = (key: string): string | undefined => process.env[key];
