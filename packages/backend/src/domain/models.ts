export interface User {
  userId: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type HuntStatus = 'draft' | 'active' | 'closed';

export interface Hunt {
  huntId: string;
  ownerId: string;
  name: string;
  description?: string;
  gameCode: string;
  status: HuntStatus;
  startTime?: string;
  endTime?: string;
  autoCloseAtEndTime?: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  allowSolo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Facet {
  facetId: string;
  huntId: string;
  name: string;
  allowedValues: string[];
}

export interface Task {
  taskId: string;
  huntId: string;
  title: string;
  description?: string;
  points: number;
  tags: string[];
  facetValues?: Record<string, string>;
  maxCompletionsPerTeam?: number | null;
  maxTeamsCanComplete?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  teamId: string;
  huntId: string;
  name: string;
  createdAt: string;
}

export type TeamRole = 'member' | 'captain';

export interface TeamMembership {
  teamId: string;
  userId: string;
  roleWithinTeam: TeamRole;
  createdAt: string;
}

export interface JudgeAssignment {
  huntId: string;
  userId: string;
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export interface Submission {
  submissionId: string;
  huntId: string;
  taskId: string;
  teamId: string;
  submittedByUserId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  notes?: string;
  status: SubmissionStatus;
  judgedByUserId?: string;
  judgedAt?: string;
  judgeComment?: string;
  awardedPoints?: number;
  isFavorite?: boolean;
  submittedAt: string;
}

export interface TeamScore {
  huntId: string;
  teamId: string;
  totalPoints: number;
  updatedAt: string;
}
