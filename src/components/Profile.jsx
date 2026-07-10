import React, { useState } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { GET_ME, LOGOUT_USER } from '../graphql';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';

export default function Profile({ setToken }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');

  const { loading, error, data } = useQuery(GET_ME, {
    fetchPolicy: 'network-only' // Always fetch fresh user data
  });

  const userId = data?.me?.id;

  const [logout] = useMutation(LOGOUT_USER);
  const client = useApolloClient();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    if (setToken) setToken(null);
    client.resetStore();
    navigate('/');
  };

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-on-surface-variant mb-4">You need to be logged in to view your profile.</p>
        <button onClick={() => navigate('/login')} className="text-primary hover:underline font-label-caps">Go to Login</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="glass-card rounded-xl p-4 sticky top-24 flex flex-col gap-2">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-4 px-4 pt-2">My Profile</div>

          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body-md transition-colors w-full text-left ${activeTab === 'posts' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-variant'}`}
          >
            <span className="material-symbols-outlined">article</span>
            My Posts
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-body-md transition-colors w-full text-left ${activeTab === 'details' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-variant'}`}
          >
            <span className="material-symbols-outlined">person</span>
            Profile Details
          </button>

          <div className="h-px bg-outline-variant my-2 mx-4"></div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-body-md text-error hover:bg-error/10 transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === 'posts' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <h2 className="font-headline-lg text-headline-lg mb-6 text-on-surface">My Published Posts</h2>
            <PostList authorId={userId} />
          </div>
        )}

        {activeTab === 'details' && (
          <div className="glass-card rounded-xl p-8 animate-in slide-in-from-right-4 duration-300">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Profile Details</h2>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <p className="text-error font-body-md">Error loading user details: {error.message}</p>
            ) : data?.me ? (
              <div className="space-y-6">
                <div>
                  <p className="font-label-md text-on-surface-variant mb-1 uppercase tracking-wider">Name</p>
                  <p className="font-body-lg text-on-surface">{data.me.name}</p>
                </div>
                <div>
                  <p className="font-label-md text-on-surface-variant mb-1 uppercase tracking-wider">Username</p>
                  <p className="font-body-lg text-on-surface">{data.me.username}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
