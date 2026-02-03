import { PostHogRecording } from '@bugbot/shared';

interface PostHogClient {
  apiKey: string;
  projectId: string;
}

export function createPostHogClient(apiKey: string, projectId: string): PostHogClient {
  return { apiKey, projectId };
}

export async function findRecordingsForUser(
  client: PostHogClient,
  userEmail: string,
  limit: number = 5
): Promise<PostHogRecording[]> {
  // First, find the person
  const personResponse = await fetch(
    `https://app.posthog.com/api/projects/${client.projectId}/persons/?email=${encodeURIComponent(userEmail)}`,
    {
      headers: {
        'Authorization': `Bearer ${client.apiKey}`
      }
    }
  );

  if (!personResponse.ok) {
    throw new Error(`PostHog API error: ${personResponse.statusText}`);
  }

  const personData = await personResponse.json() as {
    results: Array<{ distinct_ids: string[] }>;
  };

  if (personData.results.length === 0) {
    return [];
  }

  const distinctId = personData.results[0].distinct_ids[0];

  // Fetch recordings for this person
  const recordingsResponse = await fetch(
    `https://app.posthog.com/api/projects/${client.projectId}/session_recordings/?person_uuid=${distinctId}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${client.apiKey}`
      }
    }
  );

  if (!recordingsResponse.ok) {
    throw new Error(`PostHog API error: ${recordingsResponse.statusText}`);
  }

  const recordingsData = await recordingsResponse.json() as {
    results: Array<{
      id: string;
      recording_duration: number;
      start_time: string;
    }>;
  };

  return recordingsData.results.map(r => ({
    id: r.id,
    url: `https://app.posthog.com/project/${client.projectId}/replay/${r.id}`,
    duration: r.recording_duration,
    timestamp: r.start_time
  }));
}

export async function findRecordingsBySession(
  client: PostHogClient,
  sessionId: string
): Promise<PostHogRecording | null> {
  const response = await fetch(
    `https://app.posthog.com/api/projects/${client.projectId}/session_recordings/${sessionId}`,
    {
      headers: {
        'Authorization': `Bearer ${client.apiKey}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`PostHog API error: ${response.statusText}`);
  }

  const data = await response.json() as {
    id: string;
    recording_duration: number;
    start_time: string;
  };

  return {
    id: data.id,
    url: `https://app.posthog.com/project/${client.projectId}/replay/${data.id}`,
    duration: data.recording_duration,
    timestamp: data.start_time
  };
}
