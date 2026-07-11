import React, { createContext, useContext, useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      username
    }
  }
`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  // authChecked: true once the initial me query has settled and state is committed.
  // ProtectedRoute must wait for this before deciding to redirect.
  const [authChecked, setAuthChecked] = useState(false);

  const { data, loading, error, refetch, client } = useQuery(ME_QUERY, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    // While Apollo is still fetching, do nothing.
    if (loading) return;

    if (data?.me) {
      setIsAuthenticated(true);
      setUser(data.me);
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      // Query resolved (error or me === null) — user is not authenticated.
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('isAuthenticated');
    }
    // Mark the initial auth check as complete only after state is set.
    setAuthChecked(true);
  }, [data, loading, error]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    refetch();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setAuthChecked(true);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    client.clearStore();
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [client]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading: !authChecked, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
