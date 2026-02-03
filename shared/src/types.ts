/**
 * Shared types for bugbot
 */

export interface DiscordContext {
  channelId: string;
  threadId?: string;
  messageId: string;
  userId: string;
  guildId: string;
  messageContent: string;
  recentMessages?: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      username: string;
    };
  }>;
}

export interface ExtractedRefs {
  linearIssueId?: string;
  linearIssueUrl?: string;
  githubRepoUrl?: string;
  postHogSessionId?: string;
  userEmail?: string;
}

export type Command = 'contextualize' | 'fix';

export interface QueueMessage {
  command: Command;
  discordContext: DiscordContext;
  extractedRefs: ExtractedRefs;
  timestamp: number;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
}

export interface PostHogRecording {
  id: string;
  url: string;
  duration: number;
  timestamp: string;
}

export interface ContextPacket {
  linearIssue: LinearIssue;
  postHogRecordings: PostHogRecording[];
  bugBehavior: string;
  intendedBehavior: string;
  reproSteps: string[];
}

export interface FixResult {
  success: boolean;
  prUrl?: string;
  branchName?: string;
  error?: string;
}
