import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { LOGIN_USER, SIGNUP_USER } from '../graphql';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export default function AuthForm({ setToken }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [login, { loading: loginLoading }] = useMutation(LOGIN_USER, {
    onCompleted: (data) => {
      localStorage.setItem('isAuthenticated', 'true');
      setToken('true');

      const intendedView = localStorage.getItem('redirectToAfterLogin');
      if (intendedView) {
        localStorage.removeItem('redirectToAfterLogin');
        navigate(intendedView);
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      setErrorMsg(error.message);
    }
  });

  const [signup, { loading: signupLoading }] = useMutation(SIGNUP_USER, {
    onCompleted: (data) => {
      localStorage.setItem('isAuthenticated', 'true');
      setToken('true');

      const intendedView = localStorage.getItem('redirectToAfterLogin');
      if (intendedView) {
        localStorage.removeItem('redirectToAfterLogin');
        navigate(intendedView);
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      setErrorMsg(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username and password are required');
      return;
    }

    if (isLogin) {
      login({ variables: { username, password } });
    } else {
      if (!name.trim()) {
        setErrorMsg('Name is required for signup');
        return;
      }
      signup({ variables: { name, username, password } });
    }
  };

  const loading = loginLoading || signupLoading;

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in duration-300">
      <div className="glass-card rounded-xl p-8">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-[48px] text-primary mb-4">
            {isLogin ? 'login' : 'person_add'}
          </span>
          <h1 className="font-headline-sm text-headline-sm text-on-surface mb-2">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h1>
          <p className="text-on-surface-variant font-body-md">
            {isLogin ? 'Log in to continue to the editor.' : 'Sign up to start sharing your stories.'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg mb-6 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase" htmlFor="name">Full Name</label>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-on-surface placeholder:text-outline outline-none transition-all"
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase" htmlFor="username">Username</label>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-on-surface placeholder:text-outline outline-none transition-all"
              id="username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase" htmlFor="password">Password</label>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-on-surface placeholder:text-outline outline-none transition-all"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim() || (!isLogin && !name.trim())}
            className={`w-full bg-primary text-on-primary font-bold px-6 py-3 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/10 flex justify-center items-center gap-2 ${loading || !username.trim() || !password.trim() || (!isLogin && !name.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                Please wait...
              </>
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
            }}
            className="text-primary hover:underline text-sm font-medium"
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('redirectToAfterLogin');
            navigate('/');
          }}
          className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors"
        >
          &larr; Back to Home
        </button>
      </div>
    </div>
  );
}
