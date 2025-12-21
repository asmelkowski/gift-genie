import { useQueries } from '@tanstack/react-query';
import api from '@/lib/api';

interface GroupResponse {
  id: string;
  name: string;
  admin_user_id: string;
  created_at: string;
}

interface UseGroupNamesResult {
  groupNames: Map<string, string>;
  isLoading: boolean;
  hasError: boolean;
}

/**
 * Fetches group names for multiple group IDs in parallel using React Query.
 * Handles errors gracefully by falling back to a placeholder for failed fetches.
 *
 * @param groupIds - Array of group IDs to fetch names for
 * @returns Object containing Map of groupId -> groupName, loading state, and error state
 */
export const useGroupNames = (groupIds: string[]): UseGroupNamesResult => {
  const queries = useQueries({
    queries: groupIds.map(groupId => ({
      queryKey: ['groups', groupId],
      queryFn: async (): Promise<{ name: string; isError: boolean }> => {
        try {
          const { data } = await api.get<GroupResponse>(`/groups/${groupId}`);
          return { name: data.name, isError: false };
        } catch (error) {
          // Log the error for debugging but don't break the UI
          console.warn(
            `Failed to fetch group ${groupId}. Using placeholder.`,
            error instanceof Error ? error.message : 'Unknown error'
          );
          // Return a placeholder with error flag using the first 8 characters of the ID
          return {
            name: `Group (${groupId.slice(0, 8)}...)`,
            isError: true,
          };
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1, // Retry once on failure
      enabled: !!groupId, // Only fetch if groupId is provided
    })),
  });

  // Build the Map and aggregate states
  const groupNames = new Map<string, string>();
  let isLoading = false;
  let hasError = false;

  queries.forEach((query, index) => {
    const groupId = groupIds[index];
    if (query.data) {
      groupNames.set(groupId, query.data.name);
      if (query.data.isError) {
        hasError = true;
      }
    }
    if (query.isLoading) {
      isLoading = true;
    }
  });

  return {
    groupNames,
    isLoading,
    hasError,
  };
};
