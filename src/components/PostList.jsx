import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_POSTS, UPDATE_POST, DELETE_POST } from '../graphql';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTagColorClass } from '../utils/tagColors';
import { useToast } from './Toast';

/**
 * PostList Component
 * 
 * Renders a list of blog posts with infinite scrolling functionality.
 * When an `authorId` is provided, it acts as a "Profile/Dashboard" view,
 * displaying both published and draft posts along with management action buttons.
 * Otherwise, it displays the public feed of published posts.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.authorId] - Optional ID to filter posts by author
 */
export default function PostList({ authorId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [copiedPostId, setCopiedPostId] = useState(null);

  const [updatePost] = useMutation(UPDATE_POST, {
    onCompleted: (data) => {
      const status = data.updatePost.status;
      if (status === 'PUBLISHED') showToast('Post published successfully');
      else showToast('Post unpublished successfully');
    }
  });
  const [deletePost] = useMutation(DELETE_POST, {
    onCompleted: () => showToast('Post deleted successfully'),
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
    if (newStatus === 'DRAFT') {
      setConfirmAction({ type: 'UNPUBLISH', post, newStatus });
      return;
    }
    if (newStatus === 'PUBLISHED') {
      setConfirmAction({ type: 'PUBLISH', post, newStatus });
      return;
    }
    updatePost({ variables: { id: post.id, status: newStatus } });
  };

  const handleDelete = (e, post) => {
    e.stopPropagation();
    setConfirmAction({ type: 'DELETE', post });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === 'UNPUBLISH' || confirmAction.type === 'PUBLISH') {
      updatePost({ variables: { id: confirmAction.post.id, status: confirmAction.newStatus } });
    } else if (confirmAction.type === 'DELETE') {
      deletePost({ variables: { id: confirmAction.post.id } });
    }
    setConfirmAction(null);
  };

  /**
   * Securely copies a post's URL to the user's clipboard.
   * Uses modern navigator.clipboard for secure contexts (HTTPS/localhost),
   * and falls back to a hidden textarea with document.execCommand('copy') 
   * for non-secure environments like direct IP addresses.
   * 
   * @param {Event} e - Click event
   * @param {Object} post - The post object being copied
   */
  const handleCopyLink = (e, post) => {
    e.stopPropagation();
    const link = `${window.location.origin}/post/${post.id}`;
    
    const showCopied = () => {
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        showCopied();
      }).catch(err => {
        console.error('Failed to copy link: ', err);
      });
    } else {
      // Fallback for non-HTTPS environments (like HTTP IP addresses)
      const textArea = document.createElement("textarea");
      textArea.value = link;
      // Move textarea out of viewport
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showCopied();
      } catch (error) {
        console.error('Fallback copy failed', error);
      } finally {
        textArea.remove();
      }
    }
  };

  /**
   * ActionButton Component
   * 
   * A reusable button component used in the profile view to manage posts.
   * Includes hover tooltip support and visual transitions.
   */
  const ActionButton = ({ onClick, icon, tooltip, colorClass = "bg-surface-container-highest text-on-surface hover:bg-surface-variant" }) => (
    <div className="relative flex items-center justify-center group/btn">
      <button 
        onClick={onClick} 
        className={`${colorClass} p-2.5 rounded-full shadow-sm transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </button>
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-on-surface text-surface text-[11px] font-label-caps rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-20">
        {tooltip}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-on-surface"></div>
      </div>
    </div>
  );

  const renderActionMenu = (post) => {
    if (!authorId) return null; // Only show menu in Profile view
    return (
      <div className="absolute top-0 right-0 left-0 p-4 z-10 flex justify-end gap-2 bg-surface/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-t-xl border-b border-outline-variant/30 translate-y-[-10px] group-hover:translate-y-0" onClick={e => e.stopPropagation()}>
        {post.status === 'PUBLISHED' ? (
          <>
            <ActionButton onClick={() => navigate(`/edit/${post.id}`)} icon="edit" tooltip="Edit" />
            <ActionButton onClick={(e) => handleStatusChange(e, post, 'DRAFT')} icon="visibility_off" tooltip="Unpublish" />
            <ActionButton 
              onClick={(e) => handleCopyLink(e, post)} 
              icon={copiedPostId === post.id ? "check" : "link"} 
              tooltip={copiedPostId === post.id ? "Copied!" : "Copy Link"}
              colorClass={copiedPostId === post.id ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"}
            />
            <ActionButton onClick={(e) => handleDelete(e, post)} icon="delete" tooltip="Delete" colorClass="bg-error-container/50 text-error hover:bg-error-container" />
          </>
        ) : (
          <>
            <span className="bg-surface-variant text-on-surface-variant font-label-caps text-xs px-3 py-1 rounded-full flex items-center shadow-sm mr-auto">DRAFT</span>
            <ActionButton onClick={() => navigate(`/edit/${post.id}`)} icon="edit" tooltip="Edit" />
            <ActionButton onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`, { state: { from: location.pathname } }); }} icon="visibility" tooltip="Preview" />
            <ActionButton onClick={(e) => handleStatusChange(e, post, 'PUBLISHED')} icon="publish" tooltip="Publish" colorClass="bg-primary-container/50 text-primary hover:bg-primary-container" />
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
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`, { state: { from: location.pathname } })} className="col-span-12 md:col-span-8 glass-card glass-card-interactive rounded-xl overflow-hidden group flex flex-col md:flex-row cursor-pointer relative">
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
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`, { state: { from: location.pathname } })} className="col-span-12 md:col-span-4 glass-card glass-card-interactive rounded-xl overflow-hidden flex flex-col group cursor-pointer relative">
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
        <article key={post.id} onClick={() => navigate(`/post/${post.id}`, { state: { from: location.pathname } })} className="col-span-12 md:col-span-8 glass-card glass-card-interactive rounded-xl p-gutter flex flex-col md:flex-row gap-6 group cursor-pointer relative">
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

      {/* Custom Confirmation Popup */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmAction(null)}>
          <div className="bg-surface rounded-[28px] shadow-2xl w-full max-w-[400px] overflow-hidden border border-outline-variant/30 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm ${confirmAction.type === 'DELETE' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
                <span className="material-symbols-outlined text-[32px]">
                  {confirmAction.type === 'DELETE' ? 'delete_forever' : (confirmAction.type === 'PUBLISH' ? 'publish' : 'visibility_off')}
                </span>
              </div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface mb-4">
                {confirmAction.type === 'DELETE' ? 'Delete Post?' : (confirmAction.type === 'PUBLISH' ? 'Publish Post?' : 'Unpublish Post?')}
              </h3>
              <p className="text-body-md font-body-md text-on-surface-variant mb-8 px-2">
                {confirmAction.type === 'DELETE' 
                  ? 'Are you sure you want to permanently delete this post? This action cannot be undone.'
                  : (confirmAction.type === 'PUBLISH' ? 'Are you sure you want to publish this post? It will become visible to everyone.' : 'Are you sure you want to unpublish this post? It will be moved to drafts and hidden from public view.')}
              </p>
              <div className="flex justify-center gap-4 w-full">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-3 px-4 font-label-large text-on-surface rounded-xl border border-outline-variant hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmAction}
                  className={`flex-1 py-3 px-4 font-label-large rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                    confirmAction.type === 'DELETE' 
                      ? 'bg-error text-on-error hover:opacity-90 shadow-error/20' 
                      : 'bg-primary text-on-primary hover:opacity-90 shadow-primary/20'
                  }`}
                >
                  {confirmAction.type === 'DELETE' ? 'Delete' : (confirmAction.type === 'PUBLISH' ? 'Publish' : 'Unpublish')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
