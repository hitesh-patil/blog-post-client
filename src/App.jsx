import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import PostList from './components/PostList';
import PostForm from './components/PostForm';
import PostDetail from './components/PostDetail';
import AuthForm from './components/AuthForm';
import Profile from './components/Profile';

// A wrapper for protected routes
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // Save the intended route so they can redirect back after login
    localStorage.setItem('redirectToAfterLogin', location.pathname);
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Header token={token} setToken={setToken} />
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-gutter py-stack-lg">
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
      </main>
    </div>
  );
}

export default App;
