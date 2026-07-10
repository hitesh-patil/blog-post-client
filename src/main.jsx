import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { ApolloProvider } from '@apollo/client/react'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql';
const httpLink = new HttpLink({ 
  uri: apiUrl,
  credentials: 'include' 
});

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        // Force reload to redirect to login if protected route
        window.location.href = '/login';
      }
    }
  }
});

const client = new ApolloClient({
  enhancedClientAwareness: {
    transport: false
  },
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)
