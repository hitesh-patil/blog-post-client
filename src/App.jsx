import React, { useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';

// Lazy loaded route components
const PostList = React.lazy(() => import('./components/PostList'));
const PostForm = React.lazy(() => import('./components/PostForm'));
const PostDetail = React.lazy(() => import('./components/PostDetail'));
const AuthForm = React.lazy(() => import('./components/AuthForm'));
const Profile = React.lazy(() => import('./components/Profile'));

// A wrapper for protected routes
function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  const location = useLocation();

  if (!isAuthenticated) {
    // Save the intended route so they can redirect back after login
    localStorage.setItem('redirectToAfterLogin', location.pathname);
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('isAuthenticated'));

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Header token={token} setToken={setToken} />
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-gutter py-stack-lg">
        <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Routes>
            <Route path="/" element={<PostList />} />
            <Route 
              path="/add" 
              element={
                <ProtectedRoute>
                  <PostForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit/:id" 
              element={
                <ProtectedRoute>
                  <PostForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile setToken={setToken} />
                </ProtectedRoute>
              } 
            />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/login" element={<AuthForm setToken={setToken} />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
