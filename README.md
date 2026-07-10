# Blog Posts Client

The frontend application for the full-stack blog platform.

## Overview
This is a modern React application bootstrapped with Vite, featuring a sleek, responsive design and a fully-featured rich text editor for creating blog posts.

## Approach
The frontend architecture emphasizes a premium user experience and efficient state management. We used **React** with **Vite** for fast HMR and optimized builds. **Apollo Client** was chosen to manage both local UI state and remote GraphQL data seamlessly, significantly reducing network payload by requesting only the needed fields. For content creation, we integrated **CKEditor 5** paired with a direct **Cloudinary** upload mechanism, allowing for rich media integration without burdening the backend servers. Styling was done using **Vanilla CSS**, relying on modern CSS variables, glassmorphism principles, and micro-animations to achieve a high-end feel without the bloat of heavy CSS frameworks.

## Tech Stack
- **React**: UI library
- **Vite**: Build tool and dev server
- **Apollo Client**: GraphQL state management and data fetching
- **CKEditor 5**: Rich text editing with image and video support
- **React Router DOM**: Client-side routing
- **Vanilla CSS**: Custom styling with a premium aesthetic

## Prerequisites
Before you start, make sure you have created a Cloudinary account for media uploads (images and videos in posts).

You will need to set up the following environment variables in a `.env` file in the `client` directory:
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## Available Scripts

In the project directory, you can run:

### `npm run dev`
Runs the app in the development mode.
Open [http://localhost:5174](http://localhost:5174) to view it in your browser.

### `npm run build`
Builds the app for production to the `dist` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

### Docker Setup
To run the client completely containerized via Docker:
```bash
docker-compose up --build
```
This builds a multi-stage Docker image (using Vite to build the static bundle and Nginx to serve it on port `8080`).

## Key Features
- **User Authentication**: Secure signup and login workflows saving JWT tokens.
- **Rich Text Editor**: Seamless integration with CKEditor 5 allowing media embeds, block quotes, text formatting, and direct Cloudinary uploads.
- **My Posts & Drafts**: Dedicated profile section to manage your published posts and drafts. You can edit, preview, unpublish, and delete posts from here.
- **Responsive Layout**: Designed to work beautifully on both desktop and mobile devices.
