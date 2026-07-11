import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { ApolloClient, InMemoryCache, HttpLink, from, ApolloLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { ApolloProvider } from '@apollo/client/react'
import { AuthProvider } from './context/AuthContext'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql';
const httpLink = new HttpLink({ 
  uri: apiUrl,
  credentials: 'include' 
});

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
  }
});

const stripClientAwarenessLink = new ApolloLink((operation, forward) => {
  if (operation.extensions && operation.extensions.clientLibrary) {
    delete operation.extensions.clientLibrary;
  }
  return forward(operation);
});

const client = new ApolloClient({
  link: from([stripClientAwarenessLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)
