import { useQuery } from '@apollo/client/react';
import { GET_POST } from '../graphql';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getTagColorClass } from '../utils/tagColors';

export default function PostDetail() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backUrl = location.state?.from || '/';

  const { loading, error, data } = useQuery(GET_POST, {
    variables: { id: postId }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <span className="material-symbols-outlined animate-spin text-[40px] text-primary mb-4">sync</span>
        <p className="text-on-surface-variant">Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[40px] text-error mb-4">error</span>
        <p className="text-error">Error loading post: {error.message}</p>
        <Link
          to="/"
          className="mt-4 text-primary hover:underline font-label-caps inline-block"
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  const post = data?.getPost;

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-on-surface-variant">Post not found.</p>
        <Link
          to="/"
          className="mt-4 text-primary hover:underline font-label-caps inline-block"
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  const dateStr = new Date(Number(post.createdAt)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const tags = post.tags && post.tags.length > 0 ? post.tags : ['GENERAL'];

  return (
    <article className="max-w-3xl mx-auto animate-in fade-in duration-300">
      <Link
        to={backUrl}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 font-label-caps inline-flex"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Posts
      </Link>

      <header className="mb-stack-lg">
        <div className="flex gap-2 mb-8 flex-wrap">
          {tags.map((t, i) => (
            <span key={i} className={`${getTagColorClass(t)} font-label-caps text-xs px-3 py-1 rounded uppercase`}>#{t}</span>
          ))}
        </div>
        {post.coverImage && (
          <div className="w-full h-80 rounded-xl overflow-hidden mb-8 shadow-md">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-stack-md leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-6 text-on-surface-variant font-body-md border-b border-outline-variant pt-stack-sm pb-2 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined">person</span>
            {post.author?.name || 'Anonymous'}
          </span>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined">calendar_today</span>
            {dateStr}
          </span>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            {Math.max(1, Math.ceil(post.description.length / 500))} min read
          </span>
        </div>
      </header>

      <div 
        className="prose max-w-none text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap mt-stack-lg"
        dangerouslySetInnerHTML={{ __html: post.description }}
      />
    </article>
  );
}
