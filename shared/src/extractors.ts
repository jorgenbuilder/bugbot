import { ExtractedRefs, DiscordContext } from './types';

/**
 * Extract Linear issue references from Discord messages
 */
export function extractLinearIssue(text: string): { id?: string; url?: string } {
  // Match Linear issue URLs: https://linear.app/workspace/issue/PROJ-123
  const urlMatch = text.match(/https:\/\/linear\.app\/[^\/]+\/issue\/([A-Z]+-\d+)/i);
  if (urlMatch) {
    return { id: urlMatch[1], url: urlMatch[0] };
  }

  // Match Linear issue IDs: PROJ-123
  const idMatch = text.match(/\b([A-Z]+-\d+)\b/);
  if (idMatch) {
    return { id: idMatch[1] };
  }

  return {};
}

/**
 * Extract GitHub repository URL from Discord messages
 */
export function extractGitHubRepo(text: string): string | undefined {
  const match = text.match(/https:\/\/github\.com\/([^\/]+\/[^\/\s]+)/);
  return match ? match[0].replace(/\.git$/, '') : undefined;
}

/**
 * Extract PostHog session ID from Discord messages
 */
export function extractPostHogSession(text: string): string | undefined {
  // Match PostHog session URLs or IDs
  const match = text.match(/posthog\.com\/.*session[s]?\/([a-f0-9-]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Extract user email from Discord messages
 */
export function extractUserEmail(text: string): string | undefined {
  const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return match ? match[0] : undefined;
}

/**
 * Extract all references from Discord context
 */
export function extractReferences(context: DiscordContext): ExtractedRefs {
  const allText = [
    context.messageContent,
    ...(context.recentMessages?.map(m => m.content) || [])
  ].join('\n');

  const linear = extractLinearIssue(allText);

  return {
    linearIssueId: linear.id,
    linearIssueUrl: linear.url,
    githubRepoUrl: extractGitHubRepo(allText),
    postHogSessionId: extractPostHogSession(allText),
    userEmail: extractUserEmail(allText)
  };
}
