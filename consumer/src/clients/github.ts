interface GitHubClient {
  token: string;
}

export function createGitHubClient(token: string): GitHubClient {
  return { token };
}

export async function searchCode(
  client: GitHubClient,
  repo: string,
  query: string
): Promise<Array<{ path: string; url: string }>> {
  const [owner, repoName] = repo.replace('https://github.com/', '').split('/');
  const searchQuery = `${query} repo:${owner}/${repoName}`;

  const response = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}`,
    {
      headers: {
        'Authorization': `token ${client.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json() as {
    items: Array<{ path: string; html_url: string }>;
  };

  return data.items.map(item => ({
    path: item.path,
    url: item.html_url
  }));
}

export async function getFileContent(
  client: GitHubClient,
  repo: string,
  path: string,
  ref: string = 'main'
): Promise<string> {
  const [owner, repoName] = repo.replace('https://github.com/', '').split('/');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${ref}`,
    {
      headers: {
        'Authorization': `token ${client.token}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return response.text();
}

export async function createBranch(
  client: GitHubClient,
  repo: string,
  branchName: string,
  baseBranch: string = 'main'
): Promise<void> {
  const [owner, repoName] = repo.replace('https://github.com/', '').split('/');

  // Get base branch SHA
  const baseResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${baseBranch}`,
    {
      headers: {
        'Authorization': `token ${client.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!baseResponse.ok) {
    throw new Error(`Failed to get base branch: ${baseResponse.statusText}`);
  }

  const baseData = await baseResponse.json() as { object: { sha: string } };

  // Create new branch
  const createResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${client.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseData.object.sha
      })
    }
  );

  if (!createResponse.ok) {
    throw new Error(`Failed to create branch: ${createResponse.statusText}`);
  }
}

export async function createPullRequest(
  client: GitHubClient,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string = 'main'
): Promise<string> {
  const [owner, repoName] = repo.replace('https://github.com/', '').split('/');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/pulls`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${client.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PR: ${error}`);
  }

  const data = await response.json() as { html_url: string };
  return data.html_url;
}
