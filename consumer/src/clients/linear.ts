import { LinearIssue } from '@bugbot/shared';

interface LinearClient {
  apiKey: string;
}

export function createLinearClient(apiKey: string): LinearClient {
  return { apiKey };
}

export async function getIssue(client: LinearClient, issueId: string): Promise<LinearIssue | null> {
  const query = `
    query($issueId: String!) {
      issue(id: $issueId) {
        id
        identifier
        title
        description
        url
      }
    }
  `;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': client.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { issueId }
    })
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.statusText}`);
  }

  const data = await response.json() as { data: { issue: LinearIssue | null } };
  return data.data.issue;
}

export async function createIssue(
  client: LinearClient,
  teamId: string,
  title: string,
  description?: string
): Promise<LinearIssue> {
  const mutation = `
    mutation($teamId: String!, $title: String!, $description: String) {
      issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
        success
        issue {
          id
          identifier
          title
          description
          url
        }
      }
    }
  `;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': client.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: mutation,
      variables: { teamId, title, description }
    })
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.statusText}`);
  }

  const data = await response.json() as {
    data: { issueCreate: { success: boolean; issue: LinearIssue } }
  };

  if (!data.data.issueCreate.success) {
    throw new Error('Failed to create Linear issue');
  }

  return data.data.issueCreate.issue;
}

export async function addComment(client: LinearClient, issueId: string, body: string): Promise<void> {
  const mutation = `
    mutation($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }
  `;

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': client.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: mutation,
      variables: { issueId, body }
    })
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.statusText}`);
  }

  const data = await response.json() as { data: { commentCreate: { success: boolean } } };

  if (!data.data.commentCreate.success) {
    throw new Error('Failed to add comment to Linear issue');
  }
}
