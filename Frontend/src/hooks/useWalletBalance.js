import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiEndpoints } from '../utils/apiInterceptor';

export const useWalletBalance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('No authenticated user');
      }

      const response = await apiEndpoints.wallet();
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid wallet data received');
      }

      // Map the backend response to what the component expects
      return {
        balance: data.data.quantz_balance || data.data.balance || 0,
        currency: 'USD',
        total_invested: data.data.total_invested || 0,
        total_returns: data.data.total_returns || 0,
        updated_at: data.data.updated_at
      };
    },
    enabled: !!user, // Only run query when user is authenticated
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: true, // Continue polling in background
    staleTime: 10000, // Data considered fresh for 10 seconds
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for auth errors
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
