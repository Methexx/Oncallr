export function useAuth() {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
  };
}
