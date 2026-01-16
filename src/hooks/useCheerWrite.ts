import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useCheerStore } from '../store/cheerStore'; // Removed
import { useCheerMutations } from './useCheerQueries'; // Added
import * as cheerApi from '../api/cheerApi';

export const useCheerWrite = (favoriteTeam: string | null) => {
    const navigate = useNavigate();
    // const { createPost } = useCheerStore(); // Removed
    const { createPostMutation } = useCheerMutations(); // Added

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newFilePreviews, setNewFilePreviews] = useState<{ file: File; url: string }[]>([]);

    const [isDragging, setIsDragging] = useState(false);
    // const [isSubmitting, setIsSubmitting] = useState(false); // Handled by mutation
    const [showTeamRequiredDialog, setShowTeamRequiredDialog] = useState(false);

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (files: File[]) => {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        const combinedFiles = [...newFiles, ...validFiles].slice(0, 10);

        setNewFiles(combinedFiles);

        // Generate Previews
        const newPreviews = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        setNewFilePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
    };

    const handleRemoveNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
        setNewFilePreviews(prev => {
            const target = prev[index];
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Drag & Drop
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
        if (!favoriteTeam) {
            setShowTeamRequiredDialog(true);
            return;
        }
        if (!title.trim() || !content.trim()) return;

        // setIsSubmitting(true);
        createPostMutation.mutate({
            teamId: favoriteTeam,
            title,
            content,
            postType: 'CHEER',
            files: newFiles
        }, {
            onSuccess: () => {
                navigate('/cheer');
            }
        });
    };

    return {
        title,
        setTitle,
        content,
        setContent,
        newFilePreviews,
        isDragging,
        isSubmitting: createPostMutation.isPending, // Updated
        showTeamRequiredDialog,
        setShowTeamRequiredDialog,
        handleFileSelect,
        handleRemoveNewFile,
        handleSubmit,
        handleCancel: () => navigate(-1),
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
