# Domain Model (Phase 4)

This document captures the core entities for Scavenger Hunt. All types are defined in code at `packages/backend/src/domain/models.ts`.

## User
- `userId: string`
- `displayName?: string`
- `email?: string`
- `avatarUrl?: string`
- `createdAt: string`
- `updatedAt: string`

## Hunt
- `huntId: string`
- `ownerId: string`
- `name: string`
- `description?: string`
- `gameCode: string`
- `status: 'draft' | 'active' | 'closed'`
- `startTime?: string`
- `endTime?: string`
- `autoCloseAtEndTime?: boolean`
- `minTeamSize: number`
- `maxTeamSize: number`
- `allowSolo: boolean`
- `createdAt: string`
- `updatedAt: string`

## Facet
- `facetId: string`
- `huntId: string`
- `name: string`
- `allowedValues: string[]`

## Task
- `taskId: string`
- `huntId: string`
- `title: string`
- `description?: string`
- `points: number`
- `tags: string[]`
- `facetValues?: Record<string, string>`
- `maxCompletionsPerTeam?: number | null`
- `maxTeamsCanComplete?: number | null`
- `createdAt: string`
- `updatedAt: string`

## Team
- `teamId: string`
- `huntId: string`
- `name: string`
- `createdAt: string`

## TeamMembership
- `teamId: string`
- `userId: string`
- `roleWithinTeam: 'member' | 'captain'`
- `createdAt: string`

## JudgeAssignment
- `huntId: string`
- `userId: string`
- `createdAt: string`

## Submission
- `submissionId: string`
- `huntId: string`
- `taskId: string`
- `teamId: string`
- `submittedByUserId: string`
- `mediaUrl: string`
- `thumbnailUrl?: string`
- `notes?: string`
- `status: 'pending' | 'accepted' | 'rejected'`
- `judgedByUserId?: string`
- `judgedAt?: string`
- `judgeComment?: string`
- `awardedPoints?: number`
- `isFavorite?: boolean`
- `submittedAt: string`

## TeamScore
- `huntId: string`
- `teamId: string`
- `totalPoints: number`
- `updatedAt: string`
