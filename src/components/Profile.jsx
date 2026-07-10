import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../graphql';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import PostList from './PostList';

export default function Profile({ setToken }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  
  const token = localStorage.getItem('token');
  let userId = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    } catch (e) {
      console.error("Invalid token");
    }
  }

  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id: userId },
    skip: !userId
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (setToken) setToken(null);
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
            User Details
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
          <div className="animate-in fade-in zoom-in duration-300 glass-card rounded-xl p-8 max-w-2xl">
            <h2 className="font-headline-lg text-headline-lg mb-6 text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-primary">badge</span>
              User Details
            </h2>
            
            {loading ? (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin">sync</span>
                Loading...
              </div>
            ) : error ? (
              <div className="text-error">Error loading user details: {error.message}</div>
            ) : data?.getUser ? (
              <div className="space-y-6">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase mb-1">Full Name</label>
                  <div className="text-body-lg text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3">
                    {data.getUser.name}
                  </div>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase mb-1">Username</label>
                  <div className="text-body-lg text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 flex items-center gap-2">
                    <span className="text-on-surface-variant">@</span>
                    {data.getUser.username}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
