import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useCheerStore } from '../store/cheerStore'; // Removed
import { useCheerMutations, useCheerPost } from './useCheerQueries'; // Added
import * as cheerApi from '../api/cheerApi';

export const useCheerEdit = (postId: number, favoriteTeam: string | null) => {
    const navigate = useNavigate();
    // const { updatePost } = useCheerStore(); // Removed
    const { updatePostMutation } = useCheerMutations(); // Added
    const { data: post, isLoading: loading, error: queryError } = useCheerPost(postId); // Added

    // const [post, setPost] = useState<cheerApi.CheerPost | null>(null); // Replaced by query
    // const [loading, setLoading] = useState(true); // Replaced by query
    const [error, setError] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    const [content, setContent] = useState('');

    // Image handling
    const [existingImages, setExistingImages] = useState<cheerApi.PostImageDto[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newFilePreviews, setNewFilePreviews] = useState<{ file: File; url: string }[]>([]);
    const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]); // Track locally until submit

    const [isDragging, setIsDragging] = useState(false);
    // const [isSubmitting, setIsSubmitting] = useState(false); // Replaced by mutation status

    useEffect(() => {
        if (!post) return;

        setContent(post.content || '');

        if (post.isOwner) {
            setHasAccess(true);
            // Load images for editing - separating side-effect fetching
            cheerApi.fetchPostImages(postId).then(setExistingImages).catch(console.error);
        } else {
            setHasAccess(false);
        }

    }, [post, postId]);

    // Error handling
    useEffect(() => {
        if (queryError) setError(true);
    }, [queryError]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (files: File[]) => {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        const combinedFiles = [...newFiles, ...validFiles].slice(0, 10 - existingImages.length); // Limit total images

        setNewFiles(combinedFiles);

        const newPreviews = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        setNewFilePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
    };

    const handleDeleteExistingImage = async (imgId: number) => {
        if (!confirm('이미지를 삭제하시겠습니까? (저장 시 반영됩니다)')) return;

        // Optimistically remove from UI
        setExistingImages(prev => prev.filter(img => img.id !== imgId));
        setDeletedImageIds(prev => [...prev, imgId]);

        // Note: Previously this function deleted immediately from server?
        // Original code: await cheerApi.deleteImageById(imgId);
        // But for "Edit" form, it's safer to delete on "Save". 
        // If we want to stick to original behavior (delete immediately):
        /*
        setDeletingImageId(imgId);
        try {
            await cheerApi.deleteImageById(imgId);
            setExistingImages(prev => prev.filter(img => img.id !== imgId));
        } catch (e) {
            alert('이미지 삭제 실패');
        } finally {
            setDeletingImageId(null);
        }
        */
        // Let's stick to original behavior for now to minimize surprise, but refactor to use mutation if we wanted to be pure.
        setDeletingImageId(imgId);
        cheerApi.deleteImageById(imgId)
            .then(() => {
                setExistingImages(prev => prev.filter(img => img.id !== imgId));
            })
            .catch(console.error) // Global handler shows UI, we just suppress uncaught promise
            .finally(() => {
                setDeletingImageId(null);
            });
    };

    const handleRemoveNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
        setNewFilePreviews(prev => {
            const target = prev[index];
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };


    const handleSubmit = async () => {
        updatePostMutation.mutate({
            id: postId,
            data: { content },
            newFiles: newFiles
            // deletingImageIds is handled immediately in this version
        }, {
            onSuccess: () => {
                navigate(`/cheer/${postId}`);
            }
        });
    };

    const handleCancel = () => navigate(-1);

    return {
        post,
        isLoading: loading,
        isError: error,
        hasAccess,
        content,
        setContent,
        existingImages,
        newFilePreviews,
        deletingImageId,
        isDragging,
        isSubmitting: updatePostMutation.isPending,
        handleFileSelect,
        handleDeleteExistingImage,
        handleRemoveNewFile,
        handleSubmit,
        handleCancel,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
