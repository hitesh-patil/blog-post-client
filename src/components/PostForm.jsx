import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Paragraph,
  Heading,
  Link,
  List,
  BlockQuote,
  Table,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageResize,
  MediaEmbed,
  Undo,
  Indent,
  FileRepository
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADD_POST, UPDATE_POST, GET_POSTS, GET_POST } from '../graphql';
import { getTagColorClass } from '../utils/tagColors';
import { useToast } from './Toast';

class CloudinaryUploadAdapter {
  constructor(loader) {
    this.loader = loader;
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    this.url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          if (!this.cloudName || !this.uploadPreset || this.cloudName === 'YOUR_CLOUD_NAME_HERE') {
            return reject('Cloudinary credentials not configured in .env');
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', this.uploadPreset);

          fetch(this.url, {
            method: 'POST',
            body: formData,
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.error) {
                return reject(data.error.message);
              }
              resolve({
                default: data.secure_url,
              });
            })
            .catch((error) => {
              reject(error.message || 'Upload failed');
            });
        })
    );
  }

  abort() { }
}

function CloudinaryUploadAdapterPlugin(editor) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
    return new CloudinaryUploadAdapter(loader);
  };
}

export default function PostForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [isPreview, setIsPreview] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [editorInstance, setEditorInstance] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [status, setStatus] = useState('PUBLISHED');

  const { data: postData } = useQuery(GET_POST, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only'
  });

  useEffect(() => {
    if (postData?.getPost) {
      const p = postData.getPost;
      setTitle(p.title || '');
      setDescription(p.description || '');
      setTags(p.tags || []);
      setCoverImage(p.coverImage || '');
      setStatus(p.status || 'PUBLISHED');
    }
  }, [postData]);



  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset || cloudName === 'YOUR_CLOUD_NAME_HERE') {
      alert('Cloudinary credentials not configured in .env');
      return;
    }

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      setCoverImage(data.secure_url);
    } catch (err) {
      alert('Cover image upload failed: ' + err.message);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset || cloudName === 'YOUR_CLOUD_NAME_HERE') {
      alert('Cloudinary credentials not configured in .env');
      return;
    }

    setUploadingVideo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      if (editorInstance) {
        editorInstance.execute('mediaEmbed', data.secure_url);
      }
    } catch (err) {
      alert('Video upload failed: ' + err.message);
    } finally {
      setUploadingVideo(false);
      e.target.value = ''; // Reset input
    }
  };

  const [addPost, { loading: addingPost, error }] = useMutation(ADD_POST, {
    update(cache, { data: { addPost } }) {
      try {
        const existingData = cache.readQuery({ query: GET_POSTS, variables: { limit: 5, offset: 0 } });
        if (existingData && existingData.getPosts) {
          cache.writeQuery({
            query: GET_POSTS,
            variables: { limit: 5, offset: 0 },
            data: {
              getPosts: [addPost, ...existingData.getPosts]
            }
          });
        }
      } catch (e) {
        // Query might not be in cache yet
      }
    },
    onCompleted: (data) => {
      const status = data.addPost.status;
      if (status === 'PUBLISHED') showToast('Post published successfully');
      else showToast('Draft saved successfully');
      navigate('/profile');
    }
  });

  const [updatePost, { loading: updatingPost }] = useMutation(UPDATE_POST, {
    onCompleted: (data) => {
      const status = data.updatePost.status;
      if (status === 'PUBLISHED') showToast('Post published successfully');
      else showToast('Draft saved successfully');
      navigate('/profile');
    }
  });

  const loading = addingPost || updatingPost;

  useEffect(() => {
    const hasUnsavedChanges = title.trim() !== '' || description.trim() !== '' || coverImage !== '';

    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !loading) {
        e.preventDefault();
        // Legacy support for some browsers
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, description, coverImage, loading]);


  const handleSubmit = (e, newStatus = 'PUBLISHED') => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (newStatus === 'PUBLISHED' && !showPublishConfirm) {
      setShowPublishConfirm(true);
      return;
    }
    
    setShowPublishConfirm(false);

    if (id) {
      updatePost({ variables: { id, title, description, tags, coverImage, status: newStatus } });
    } else {
      addPost({ variables: { title, description, tags, coverImage, status: newStatus } });
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (tagInput.trim() && !tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-300">


      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg mb-6">
          <p>Failed to add post. Please try again.</p>
        </div>
      )}

      <form className="space-y-stack-md" onSubmit={handleSubmit}>
        {!isPreview ? (
          <>
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase" htmlFor="cover-upload">Cover Image</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
                <label
                  htmlFor="cover-upload"
                  className={`flex items-center justify-center h-32 w-full max-w-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest text-on-surface cursor-pointer hover:bg-surface-variant transition-colors overflow-hidden relative ${uploadingCover ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {coverImage ? (
                    <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : uploadingCover ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
                      <span className="text-label-caps font-label-caps">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[32px]">image</span>
                      <span className="text-label-caps font-label-caps">Upload Cover Image</span>
                    </div>
                  )}
                </label>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="text-error hover:underline text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase" htmlFor="post-title">Post Title</label>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-on-surface placeholder:text-outline outline-none transition-all"
                id="post-title"
                placeholder="e.g. Scaling Microservices with Event-Driven Architecture"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="post-content">Content</label>
                {/* Hidden Video Input */}
                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                />
                {uploadingVideo && (
                  <span className="text-label-caps font-label-caps text-primary animate-pulse flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    Uploading Video...
                  </span>
                )}
              </div>
              <div className="relative group not-prose max-w-none ckeditor-wrapper">
                <CKEditor
                  editor={ClassicEditor}
                  config={{
                    licenseKey: 'GPL',
                    plugins: [
                      Essentials, Bold, Italic, Paragraph, Heading, Link, List, BlockQuote,
                      Table, Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageResize,
                      MediaEmbed, Undo, Indent, FileRepository
                    ],
                    toolbar: [
                      'heading',
                      '|',
                      'bold',
                      'italic',
                      'link',
                      'bulletedList',
                      'numberedList',
                      '|',
                      'outdent',
                      'indent',
                      '|',
                      'blockQuote',
                      'insertTable',
                      'uploadImage',
                      'mediaEmbed',
                      'undo',
                      'redo'
                    ],
                    heading: {
                      options: [
                        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                        { model: 'heading1', view: 'h2', title: 'Heading 1', class: 'ck-heading_heading1' },
                        { model: 'heading2', view: 'h3', title: 'Heading 2', class: 'ck-heading_heading2' },
                        { model: 'heading3', view: 'h4', title: 'Heading 3', class: 'ck-heading_heading3' },
                        { model: 'heading4', view: 'h5', title: 'Heading 4', class: 'ck-heading_heading4' }
                      ]
                    },
                    mediaEmbed: {
                      previewsInData: true,
                      providers: [
                        {
                          name: 'cloudinary-video',
                          url: /^https?:\/\/res\.cloudinary\.com\/.*\/video\/upload\/.*/,
                          html: match => {
                            const url = match[0];
                            return (
                              '<div style="position: relative; padding-bottom: 56.25%; height: 0;">' +
                              `<video controls src="${url}" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;"></video>` +
                              '</div>'
                            );
                          }
                        }
                      ]
                    },
                    image: {
                      resizeOptions: [
                        {
                          name: 'resizeImage:original',
                          label: 'Original',
                          value: null,
                          icon: 'original'
                        },
                        {
                          name: 'resizeImage:50',
                          label: '50%',
                          value: '50',
                          icon: 'medium'
                        },
                        {
                          name: 'resizeImage:75',
                          label: '75%',
                          value: '75',
                          icon: 'large'
                        }
                      ],
                      toolbar: [
                        'imageStyle:inline',
                        'imageStyle:block',
                        'imageStyle:side',
                        '|',
                        'toggleImageCaption',
                        'imageTextAlternative',
                        '|',
                        'resizeImage:50',
                        'resizeImage:75',
                        'resizeImage:original'
                      ]
                    },
                    extraPlugins: [CloudinaryUploadAdapterPlugin]
                  }}
                  data={description}
                  onReady={(editor) => {
                    setEditorInstance(editor);

                    // Inject custom Video button into CKEditor Toolbar
                    const toolbar = editor.ui.view.toolbar.element;
                    if (toolbar) {
                      const itemsContainer = toolbar.querySelector('.ck-toolbar__items');
                      if (itemsContainer) {
                        const videoBtn = document.createElement('button');
                        videoBtn.className = 'ck ck-button ck-off ck-button_with-text';
                        videoBtn.type = 'button';
                        videoBtn.tabIndex = -1;
                        videoBtn.innerHTML = `
                      <svg class="ck ck-icon ck-reset_all-excluded" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                      </svg>
                      <span class="ck ck-button__label" style="display: none;">Upload Video</span>
                    `;
                        // Basic styling to match CKEditor buttons
                        videoBtn.style.cursor = 'pointer';

                        videoBtn.onmouseenter = () => videoBtn.classList.add('ck-on');
                        videoBtn.onmouseleave = () => videoBtn.classList.remove('ck-on');

                        videoBtn.onclick = (e) => {
                          e.preventDefault();
                          document.getElementById('video-upload').click();
                        };

                        // Insert the custom video button right before the 'undo' button
                        // The 'undo' button is the second to last item in the toolbar array
                        const undoIndex = itemsContainer.children.length - 2;
                        if (undoIndex >= 0) {
                          itemsContainer.insertBefore(videoBtn, itemsContainer.children[undoIndex]);
                        } else {
                          itemsContainer.appendChild(videoBtn);
                        }
                      }
                    }
                  }}
                  onChange={(event, editor) => {
                    const data = editor.getData();
                    setDescription(data);
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">tag</span>
                <span className="text-label-caps font-label-caps uppercase">Tags:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag, index) => (
                  <span key={index} className={`${getTagColorClass(tag)} font-label-caps text-sm px-3 py-1 rounded-full flex items-center gap-2 border`}>
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-error transition-colors flex items-center">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add Tag..."
                    className="px-3 py-1 bg-surface-variant text-on-surface-variant focus:bg-surface-dim rounded-full text-label-caps font-label-caps transition-colors border-none outline-none focus:ring-1 focus:ring-primary w-24"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 md:p-12 mb-8 animate-in fade-in zoom-in duration-300">
            <header className="mb-stack-lg">
              <div className="flex gap-2 mb-8 flex-wrap">
                {tags.map((t, i) => (
                  <span key={i} className={`${getTagColorClass(t)} font-label-caps text-xs px-3 py-1 rounded uppercase`}>#{t}</span>
                ))}
              </div>
              {coverImage && (
                <div className="w-full h-64 md:h-[400px] rounded-xl overflow-hidden mb-8">
                  <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="font-headline-xl text-headline-xl text-on-surface mb-6">{title || 'Untitled Post'}</h1>
              <div className="flex items-center gap-4 text-on-surface-variant font-body-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span>You (Preview)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  <span>Just now</span>
                </div>
              </div>
            </header>

            <div
              className="ck-content prose prose-lg max-w-none prose-headings:font-headline-md prose-headings:text-on-surface prose-p:text-on-surface prose-a:text-primary hover:prose-a:text-surface-tint prose-strong:text-on-surface prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: description || '<p><em>No content provided.</em></p>' }}
            />
          </div>
        )}

        <div className="sticky bottom-0 z-50 py-3 mt-4 bg-background/90 backdrop-blur-md border-t border-outline-variant/30 flex flex-col md:flex-row-reverse gap-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            className={`md:min-w-[120px] bg-primary text-on-primary font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-primary/20 flex justify-center items-center gap-2 ${loading || !title.trim() || !description.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="button"
            onClick={(e) => handleSubmit(e, 'PUBLISHED')}
            disabled={loading || !title.trim() || !description.trim()}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                Saving...
              </>
            ) : (
              'Publish Post'
            )}
          </button>
          <button
            className={`md:min-w-[120px] bg-surface-container-high text-on-surface font-semibold text-sm px-4 py-2 rounded-lg hover:bg-surface-variant active:scale-95 transition-all flex justify-center items-center gap-2 ${loading || !title.trim() || !description.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="button"
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            disabled={loading || !title.trim() || !description.trim()}
          >
            Save as Draft
          </button>

          <button
            className={`md:min-w-[120px] bg-surface-variant text-on-surface-variant px-4 py-2 rounded-lg hover:bg-outline-variant transition-colors font-semibold text-sm flex justify-center items-center gap-2 ${!isPreview && (!title.trim() || !description.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            disabled={loading || (!isPreview && (!title.trim() || !description.trim()))}
          >
            <span className="material-symbols-outlined text-[18px]">{isPreview ? 'edit' : 'visibility'}</span>
            <span className="whitespace-nowrap">{isPreview ? 'Back to Edit' : 'Preview'}</span>
          </button>

          {!isPreview && (
            <button
              className="md:min-w-[120px] border border-outline text-on-surface px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors font-semibold text-sm whitespace-nowrap"
              type="button"
              onClick={() => {
                const hasUnsavedChanges = title.trim() !== '' || description.trim() !== '' || coverImage !== '';
                if (hasUnsavedChanges && !loading) {
                  setShowCancelConfirm(true);
                } else {
                  navigate('/');
                }
              }}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Custom Confirmation Popup for Cancel */}
        {showCancelConfirm && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-background/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowCancelConfirm(false)}>
            <div 
              className="bg-surface border border-outline-variant rounded-[28px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface mb-3">Discard changes?</h3>
              <p className="text-body-md text-on-surface-variant mb-8">
                You have unsaved changes. Are you sure you want to discard them? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl border border-outline font-semibold text-on-surface hover:bg-surface-variant transition-colors"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Editing
                </button>
                <button 
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl bg-error text-on-error font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-md"
                  onClick={() => navigate('/')}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Custom Confirmation Popup for Publish */}
        {showPublishConfirm && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-background/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPublishConfirm(false)}>
            <div 
              className="bg-surface border border-outline-variant rounded-[28px] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-[32px]">publish</span>
              </div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface mb-4">Publish Post?</h3>
              <p className="text-body-md font-body-md text-on-surface-variant mb-8 px-2">
                Are you sure you want to publish this post? It will become visible to everyone.
              </p>
              
              <div className="flex justify-center gap-4 w-full">
                <button 
                  type="button"
                  onClick={() => setShowPublishConfirm(false)}
                  className="flex-1 py-3 px-4 font-label-large text-on-surface rounded-xl border border-outline-variant hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                  className="flex-1 py-3 px-4 font-label-large rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 bg-primary text-on-primary hover:opacity-90 shadow-primary/20"
                >
                  Publish
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </form>
    </div>
  );
}
