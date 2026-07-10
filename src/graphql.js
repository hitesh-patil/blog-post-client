import { gql } from '@apollo/client';

export const GET_POSTS = gql`
  query GetPosts($limit: Int, $offset: Int, $authorId: ID) {
    getPosts(limit: $limit, offset: $offset, authorId: $authorId) {
      id
      title
      description
      tags
      coverImage
      status
      author {
        name
        username
      }
      createdAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      name
      username
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      username
    }
  }
`;

export const GET_POST = gql`
  query GetPost($id: ID!) {
    getPost(id: $id) {
      id
      title
      description
      tags
      coverImage
      status
      author {
        name
        username
      }
      createdAt
    }
  }
`;

export const ADD_POST = gql`
  mutation AddPost($title: String!, $description: String!, $tags: [String!], $coverImage: String, $status: String) {
    addPost(title: $title, description: $description, tags: $tags, coverImage: $coverImage, status: $status) {
      id
      title
      description
      tags
      coverImage
      status
      author {
        name
        username
      }
      createdAt
    }
  }
`;

export const UPDATE_POST = gql`
  mutation UpdatePost($id: ID!, $title: String, $description: String, $tags: [String!], $coverImage: String, $status: String) {
    updatePost(id: $id, title: $title, description: $description, tags: $tags, coverImage: $coverImage, status: $status) {
      id
      title
      description
      tags
      coverImage
      status
      author {
        name
        username
      }
      createdAt
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

export const SIGNUP_USER = gql`
  mutation Signup($name: String!, $username: String!, $password: String!) {
    signup(name: $name, username: $username, password: $password) {
      token
      userId
    }
  }
`;

export const LOGIN_USER = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      userId
    }
  }
`;

export const LOGOUT_USER = gql`
  mutation Logout {
    logout
  }
`;
