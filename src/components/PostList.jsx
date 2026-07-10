import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_POSTS, UPDATE_POST, DELETE_POST } from '../graphql';
import { useNavigate } from 'react-router-dom';
import { getTagColorClass } from '../utils/tagColors';

export default function PostList({ authorId }) {
  const navigate = useNavigate();
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const [updatePost] = useMutation(UPDATE_POST);
  const [deletePost] = useMutation(DELETE_POST, {
    update(cache, { data: { deletePost } }) {
      cache.modify({
        fields: {
          getPosts(existingPosts, { readField }) {
            return existingPosts.filter(postRef => deletePost !== readField('id', postRef));
          }
        }
      });
    }
  });

  const { loading, error, data, fetchMore } = useQuery(GET_POSTS, {
    variables: { limit: 5, offset: 0, authorId },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
  });

  const posts = data?.getPosts || [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore({
            variables: {
              offset: posts.length,
              limit: 5,
              authorId
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult || fetchMoreResult.getPosts.length === 0) {
                setHasMore(false);
                return prev;
              }
              if (fetchMoreResult.getPosts.length < 5) {
                setHasMore(false);
              }
              
              // Prevent duplicates (sometimes StrictMode double-fires)
              const existingIds = new Set(prev.getPosts.map(p => p.id));
              const newPosts = fetchMoreResult.getPosts.filter(p => !existingIds.has(p.id));
              
              return Object.assign({}, prev, {
                getPosts: [...prev.getPosts, ...newPosts]
              });
            }
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, fetchMore, posts.length]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
        <span className="material-symbols-outlined animate-spin text-[40px] text-primary mb-4">sync</span>
        <p className="text-on-surface-variant">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[40px] text-error mb-4">error</span>
        <p className="text-error">Error loading posts: {error.message}</p>
      </div>
    );
  }

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleStatusChange = (e, post, newStatus) => {
    e.stopPropagation();
    updatePost({ variables: { id: post.id, status: newStatus } });
  };

  const handleDelete = (e, post) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this post?')) {
      deletePost({ variables: { id: post.id } });
    }
  };

  const handleCopyLink = (e, post) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    alert('Link copied to clipboard!');
  };

  const renderActionMenu = (post) => {
    if (!authorId) return null; // Only show menu in Profile view
    return (
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={e => e.stopPropagation()}>
        {post.status === 'PUBLISHED' ? (
          <>
            <button onClick={() => navigate(`/edit/${post.id}`)} className="bg-surface/80 backdrop-blur text-on-surface hover:bg-surface p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Edit">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onClick={(e) => handleStatusChange(e, post, 'DRAFT')} className="bg-surface/80 backdrop-blur text-on-surface hover:bg-surface p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Unpublish">
              <span className="material-symbols-outlined text-[18px]">visibility_off</span>
            </button>
            <button onClick={(e) => handleCopyLink(e, post)} className="bg-surface/80 backdrop-blur text-on-surface hover:bg-surface p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Copy Link">
              <span className="material-symbols-outlined text-[18px]">link</span>
            </button>
            <button onClick={(e) => handleDelete(e, post)} className="bg-error/10 text-error hover:bg-error/20 p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Delete">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </>
        ) : (
          <>
            <span className="bg-surface-variant text-on-surface-variant font-label-caps text-xs px-3 py-1 rounded-full flex items-center shadow mr-2">DRAFT</span>
            <button onClick={() => navigate(`/edit/${post.id}`)} className="bg-surface/80 backdrop-blur text-on-surface hover:bg-surface p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Edit">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }} className="bg-surface/80 backdrop-blur text-on-surface hover:bg-surface p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Preview">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
            <button onClick={(e) => handleStatusChange(e, post, 'PUBLISHED')} className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-full shadow transition-colors flex items-center justify-center" title="Publish">
              <span className="material-symbols-outlined text-[18px]">publish</span>
            </button>
          </>
        )}
      </div>
    );
  };

  const renderCard = (post, index) => {
    const patternIndex = index % 4;
    const dateStr = new Date(Number(post.createdAt)).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const tags = post.tags && post.tags.length > 0 ? post.tags : ['GENERAL'];

    if (patternIndex === 0) {
      // Large Card
      return (
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="col-span-12 md:col-span-8 glass-card glass-card-interactive rounded-xl overflow-hidden group flex flex-col md:flex-row cursor-pointer relative">
          {renderActionMenu(post)}
          {post.coverImage && (
            <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
              <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${post.coverImage}')` }}></div>
            </div>
          )}
          <div className={`p-gutter flex flex-col ${post.coverImage ? 'md:w-1/2 justify-center' : 'w-full flex-grow'}`}>
            <div className="flex gap-2 mb-6 flex-wrap">
              {tags.map((t, i) => (
                <span key={i} className={`${getTagColorClass(t)} font-label-caps text-xs px-2 py-1 rounded uppercase`}>#{t}</span>
              ))}
            </div>
            <h2 className={`font-headline-lg ${post.coverImage ? 'text-headline-lg' : 'text-headline-xl lg:text-[2.5rem]'} mb-4 group-hover:text-primary transition-colors text-on-surface line-clamp-3`}>{post.title}</h2>
            <p className={`text-on-surface-variant font-body-md ${post.coverImage ? 'mb-6 line-clamp-3' : 'mb-12 line-clamp-6 text-body-lg'} flex-grow`}>{stripHtml(post.description)}</p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant">
              <div className="flex items-center gap-4 text-on-surface-variant font-label-caps text-xs flex-wrap">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {post.author?.name || 'Anonymous'}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {dateStr}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {Math.max(1, Math.ceil(stripHtml(post.description).length / 500))} min read</span>
              </div>
              <span className="text-primary material-symbols-outlined opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
            </div>
          </div>
        </article>
      );
    } else if (patternIndex === 1 || patternIndex === 2) {
      // Small Card
      return (
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="col-span-12 md:col-span-4 glass-card glass-card-interactive rounded-xl overflow-hidden flex flex-col group cursor-pointer relative">
          {renderActionMenu(post)}
          {post.coverImage && (
            <div className="w-full h-48 overflow-hidden shrink-0">
              <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${post.coverImage}')` }}></div>
            </div>
          )}
          <div className="p-gutter flex flex-col flex-grow">
            <div className="flex gap-2 mb-4 flex-wrap">
              {tags.map((t, i) => (
                <span key={i} className={`${getTagColorClass(t)} font-label-caps text-xs px-2 py-1 rounded uppercase`}>#{t}</span>
              ))}
            </div>
            <h2 className="font-headline-sm text-headline-sm mb-4 group-hover:text-primary transition-colors text-on-surface line-clamp-2">{post.title}</h2>
            <p className="text-on-surface-variant font-body-md mb-8 flex-grow line-clamp-4">{stripHtml(post.description)}</p>
            <div className="pt-4 border-t border-outline-variant flex flex-col gap-2 mt-auto">
              <div className="flex justify-between items-center w-full">
                <span className="font-label-caps text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {post.author?.name || 'Anonymous'}</span>
                <span className="text-primary material-symbols-outlined opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="font-label-caps text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {dateStr}</span>
                <span className="font-label-caps text-xs text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {Math.max(1, Math.ceil(stripHtml(post.description).length / 500))} min read</span>
              </div>
            </div>
          </div>
        </article>
      );
    } else {
      // Medium Card
      return (
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="col-span-12 md:col-span-8 glass-card glass-card-interactive rounded-xl p-gutter flex flex-col md:flex-row gap-6 group cursor-pointer relative">
          {renderActionMenu(post)}
          {post.coverImage ? (
            <div className="md:w-1/3 h-48 md:h-auto rounded overflow-hidden shrink-0">
              <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${post.coverImage}')` }}></div>
            </div>
          ) : (
            <div className="bg-surface-container rounded p-4 font-code-block text-code-block text-on-surface-variant md:w-1/3 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant">
                <span className="text-xs font-label-caps">snippet</span>
                <span className="material-symbols-outlined text-[14px] cursor-pointer">content_copy</span>
              </div>
              <code>
                {post.title.substring(0, 30).toLowerCase().replace(/\s+/g, '_')} = {'{'}
                <br/>&nbsp;&nbsp;id: "{post.id.substring(0, 5)}...",
                <br/>&nbsp;&nbsp;tags: [{tags.length}]
                <br/>{'}'}
              </code>
            </div>
          )}
          <div className="md:w-2/3 flex flex-col justify-center">
            <div className="flex gap-2 mb-4 flex-wrap">
              {tags.map((t, i) => (
                <span key={i} className={`${getTagColorClass(t)} font-label-caps text-xs px-2 py-1 rounded uppercase`}>#{t}</span>
              ))}
            </div>
            <h2 className="font-headline-sm text-headline-sm mb-2 group-hover:text-primary transition-colors text-on-surface line-clamp-2">{post.title}</h2>
            <p className="text-on-surface-variant font-body-md mb-6 line-clamp-3">{stripHtml(post.description)}</p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant">
              <div className="flex items-center gap-4 text-on-surface-variant font-label-caps text-xs flex-wrap">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {post.author?.name || 'Anonymous'}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {dateStr}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {Math.max(1, Math.ceil(stripHtml(post.description).length / 500))} min read</span>
              </div>
              <span className="text-primary material-symbols-outlined opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">arrow_forward</span>
            </div>
          </div>
        </article>
      );
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      {!authorId && (
        <section className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-headline-xl text-headline-xl mb-stack-sm text-on-background">Stories & Ideas</h1>
            <p className="text-body-lg text-on-surface-variant">A collection of thoughts, updates, and deep dives on topics from all around.</p>
          </div>
          <button 
            onClick={() => navigate('/add')}
            className="bg-primary text-on-primary font-body-md px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">add</span>
            Add New Post
          </button>
        </section>
      )}

      {posts.length === 0 && !loading ? (
        <div className="glass-card rounded-xl p-gutter text-center py-20 mt-8">
          <span className="material-symbols-outlined text-[48px] text-outline mb-4">article</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">No posts available</h2>
          <p className="text-on-surface-variant font-body-md mb-6">Be the first to write something amazing!</p>
          <button 
            onClick={() => navigate('/add')}
            className="text-primary hover:underline font-label-caps"
          >
            Create your first post
          </button>
        </div>
      ) : (
        <div className="bento-grid">
          {posts.map((post, index) => renderCard(post, index))}
        </div>
      )}

      {/* Pagination Loading State */}
      {(hasMore) && posts.length > 0 && (
        <div ref={observerTarget} className="flex justify-center py-12 w-full col-span-12">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <span className="material-symbols-outlined text-[32px] text-primary animate-spin mb-2">sync</span>
            <span className="text-on-surface-variant font-label-caps text-xs">Loading more posts...</span>
          </div>
        </div>
      )}
      
      {!hasMore && posts.length > 0 && (
        <div className="flex justify-center py-12 w-full col-span-12">
          <div className="flex flex-col items-center text-outline">
            <span className="material-symbols-outlined text-[24px] mb-2">done_all</span>
            <span className="text-on-surface-variant font-label-caps text-xs">You've reached the end!</span>
          </div>
        </div>
      )}
    </div>
  );
}
