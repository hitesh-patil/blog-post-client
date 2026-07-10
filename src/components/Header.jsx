import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Header({ token, setToken }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="flex justify-between items-center h-16 px-margin-mobile md:px-gutter max-w-container-max mx-auto">
        <Link to="/" className="font-headline-sm text-headline-sm font-bold text-on-surface cursor-pointer">
          The Blog
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`font-body-md text-body-md transition-colors ${
              location.pathname === '/'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Home
          </Link>
          <Link
            to="/add"
            className={`font-body-md text-body-md transition-colors ${
              location.pathname === '/add'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Add Post
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {token ? (
            <Link 
              to="/profile"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary transition-colors cursor-pointer"
              title="My Profile"
            >
              <span className="material-symbols-outlined text-[24px]">person</span>
            </Link>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="font-label-caps text-xs px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
