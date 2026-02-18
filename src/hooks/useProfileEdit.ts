import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProfileImage, updateProfile, checkNicknameAvailability } from '../api/profile';
import { ProfileUpdateData, UserProfile, NicknameCheckState } from '../types/profile';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { FRANCHISE_TEAM_IDS, TEAM_NAME_TO_ID } from '../constants/teams';

interface UseProfileEditProps {
  initialProfileImage: string | null;
  initialName: string;
  initialEmail: string;
  initialFavoriteTeam: string;
  initialBio?: string | null;
  onCancel: () => void;
  onSave: () => void;
}

interface FieldErrors {
  name?: string;
  bio?: string;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_NAME_LENGTH = 20;
const ALLOWED_FAVORITE_TEAMS = new Set<string>(FRANCHISE_TEAM_IDS);
const NICKNAME_CHECK_DELAY_MS = 450;
const NICKNAME_AVAILABLE_MESSAGE = '✅ 사용 가능한 닉네임입니다.';
const NICKNAME_TAKEN_MESSAGE = '⛔️ 이미 사용 중인 닉네임입니다.';
const NICKNAME_CHECKING_MESSAGE = '닉네임 중복 확인 중...';
const NICKNAME_CHECK_ERROR_MESSAGE = '닉네임 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

const normalizeTrimmedText = (value: string): string => value.trim().replace(/\s+/g, ' ');
const normalizeComparableName = (value: string): string => normalizeTrimmedText(value).toLowerCase();

export const useProfileEdit = ({
  initialProfileImage,
  initialName,
  initialEmail,
  initialFavoriteTeam,
  initialBio,
  onCancel,
  onSave,
}: UseProfileEditProps) => {
  const queryClient = useQueryClient();

  const normalizeFavoriteTeam = (team: string): string => {
    if (!team) return '없음';
    const mappedTeam = TEAM_NAME_TO_ID[team] || team;
    return ALLOWED_FAVORITE_TEAMS.has(mappedTeam) ? mappedTeam : '없음';
  };

  const validateName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '이름(닉네임)은 필수로 입력해야 합니다.';
    }
    if (trimmed.length < 2) {
      return '닉네임은 2자 이상으로 입력해주세요.';
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `닉네임은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`;
    }
    return undefined;
  };

  const validateBio = (value: string): string | undefined => {
    if (value.length > 500) {
      return '자기소개는 500자 이내여야 합니다.';
    }
    return undefined;
  };

  // ========== States ==========
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [editingFavoriteTeam, setEditingFavoriteTeamState] = useState(normalizeFavoriteTeam(initialFavoriteTeam));
  const [bio, setBioState] = useState(initialBio || '');
  const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null);
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [nicknameCheckState, setNicknameCheckState] = useState<NicknameCheckState>('idle');
  const [nicknameCheckMessage, setNicknameCheckMessage] = useState('');

  useEffect(() => {
    if (newProfileImageFile) {
      return;
    }

    setProfileImage(initialProfileImage);
  }, [initialProfileImage, newProfileImageFile]);

  const resetProfileState = useCallback(() => {
    if (profileImage && profileImage.startsWith('blob:')) {
      URL.revokeObjectURL(profileImage);
    }

    setProfileImage(initialProfileImage);
    setName(initialName);
    setEditingFavoriteTeamState(normalizeFavoriteTeam(initialFavoriteTeam));
    setBioState(initialBio || '');
    setNewProfileImageFile(null);
    setFieldErrors({});
    setSaveAttempted(false);
    setSaveMessage(null);
    setShowTeamTest(false);
    setNicknameCheckState('idle');
    setNicknameCheckMessage('');
  }, [initialBio, initialFavoriteTeam, initialName, initialProfileImage, normalizeFavoriteTeam]);

  const hasChanges = useMemo(() => {
    const normalizedInitialName = normalizeComparableName(initialName);
    const normalizedCurrentName = normalizeComparableName(name);
    const normalizedInitialBio = normalizeTrimmedText(initialBio || '');
    const normalizedCurrentBio = normalizeTrimmedText(bio);
    const normalizedInitialFavoriteTeam = normalizeFavoriteTeam(initialFavoriteTeam);

    return (
      normalizedCurrentName !== normalizedInitialName ||
      normalizedCurrentBio !== normalizedInitialBio ||
      editingFavoriteTeam !== normalizedInitialFavoriteTeam ||
      !!newProfileImageFile
    );
  }, [bio, editingFavoriteTeam, initialBio, initialFavoriteTeam, initialName, name, newProfileImageFile]);

  const isNameChecking = nicknameCheckState === 'checking';
  const isNameBlocked = nicknameCheckState === 'taken' || nicknameCheckState === 'error';
  const hasValidationErrors = Boolean(fieldErrors.name || fieldErrors.bio || isNameBlocked);

  // ========== Image Upload Mutation ==========
  const imageUploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onError: (error: Error) => {
      setSaveMessage('저장 실패');
      toast.error(error.message || '이미지 업로드에 실패했습니다.');
    },
  });

  // ========== Profile Update Mutation ==========
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      return await updateProfile(data);
    },
    onSuccess: async (response, variables) => {
      const { setUserProfile, fetchProfileAndAuthenticate, user } = useAuthStore.getState();

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }

      if (profileImage?.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }

      const resolvedProfileImageUrl = response.data.profileImageUrl ?? variables.profileImageUrl;
      const normalizedFavoriteTeam = normalizeFavoriteTeam(editingFavoriteTeam);

      const cachedProfilePatch: Partial<UserProfile> = {
        name: response.data.name ?? name.trim(),
        email,
        favoriteTeam: response.data.favoriteTeam ?? (normalizedFavoriteTeam === '없음' ? null : normalizedFavoriteTeam),
        bio: response.data.bio ?? (bio.trim() || null),
      };

      if (resolvedProfileImageUrl !== undefined) {
        cachedProfilePatch.profileImageUrl = resolvedProfileImageUrl;
      }

      const updatedUserProfilePatch: {
        email: string;
        name: string;
        favoriteTeam?: string | null;
        profileImageUrl?: string | null;
        bio?: string | null;
      } = {
        email,
        name: cachedProfilePatch.name,
      };

      if (cachedProfilePatch.favoriteTeam !== undefined) {
        updatedUserProfilePatch.favoriteTeam = cachedProfilePatch.favoriteTeam;
      }
      if (cachedProfilePatch.profileImageUrl !== undefined) {
        updatedUserProfilePatch.profileImageUrl = cachedProfilePatch.profileImageUrl;
      }
      if (cachedProfilePatch.bio !== undefined) {
        updatedUserProfilePatch.bio = cachedProfilePatch.bio;
      }

      setUserProfile(updatedUserProfilePatch);

      queryClient.setQueryData<UserProfile>(['userProfile'], (previousProfile) => {
        const baseProfile = previousProfile ?? (user
          ? {
            id: user.id,
            email: user.email,
            name: user.name || name,
            handle: user.handle,
            favoriteTeam: user.favoriteTeam || null,
            profileImageUrl: user.profileImageUrl ?? null,
            role: user.role,
            bio: user.bio ?? null,
            cheerPoints: user.cheerPoints,
          }
          : null);

        if (!baseProfile) return previousProfile;

        return {
          ...baseProfile,
          ...previousProfile,
          ...cachedProfilePatch,
        };
      });

      try {
        await fetchProfileAndAuthenticate();
      } catch (error) {
        console.error('프로필 조회 동기화 실패:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-posts'] });

      setNewProfileImageFile(null);
      setFieldErrors({});
      setSaveAttempted(false);
      setLastSavedAt(new Date());
      setSaveMessage('저장됨');
      toast.success('변경사항이 적용되었습니다.');
      onSave();
    },
    onError: (error: Error) => {
      setSaveMessage('저장 실패');
      toast.error(error.message || '프로필 저장 중 오류가 발생했습니다.');
    },
  });

  const isLoading = imageUploadMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    const normalizedName = normalizeComparableName(name);
    const normalizedInitialName = normalizeComparableName(initialName);

    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > MAX_NAME_LENGTH || isLoading) {
      setNicknameCheckState('idle');
      setNicknameCheckMessage('');
      return;
    }

    if (normalizedName === normalizedInitialName) {
      setNicknameCheckState('idle');
      setNicknameCheckMessage('');
      return;
    }

    const timer = window.setTimeout(async () => {
      setNicknameCheckState('checking');
      setNicknameCheckMessage(NICKNAME_CHECKING_MESSAGE);

      try {
        const result = await checkNicknameAvailability(normalizedName);
        if (result.available) {
          setNicknameCheckState('available');
          setNicknameCheckMessage(NICKNAME_AVAILABLE_MESSAGE);
          return;
        }

        setNicknameCheckState('taken');
        setNicknameCheckMessage(NICKNAME_TAKEN_MESSAGE);
      } catch (error) {
        setNicknameCheckState('error');
        setNicknameCheckMessage(NICKNAME_CHECK_ERROR_MESSAGE);
      }
    }, NICKNAME_CHECK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [initialName, isLoading, name]);

  // ========== Input Handlers ==========
  const handleNameChange = (value: string) => {
    setName(value);
    setSaveMessage(null);
    setFieldErrors((prev) => ({
      ...prev,
      name: validateName(value),
    }));
    setNicknameCheckState('idle');
    setNicknameCheckMessage('');
  };

  const handleBioChange = (value: string) => {
    setBioState(value);
    setSaveMessage(null);
    setFieldErrors((prev) => ({
      ...prev,
      bio: validateBio(value),
    }));
  };

  const handleFavoriteTeamChange = (team: string) => {
    setEditingFavoriteTeamState(normalizeFavoriteTeam(team));
    setSaveMessage(null);
  };

  // ========== Image Upload Handler ==========
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`파일 크기가 ${MAX_FILE_SIZE_MB}MB를 초과합니다.`);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
      return;
    }

    try {
      if (profileImage && profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }

      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      setNewProfileImageFile(file);
      setSaveMessage(null);

      toast.success('이미지가 선택되었습니다. 저장 버튼을 눌러주세요.');
    } catch (error) {
      console.error('이미지 미리보기 오류:', error);
      toast.error('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  // ========== Save Handler ==========
  const handleSave = async () => {
    const nextErrors: FieldErrors = {
      name: validateName(name),
      bio: validateBio(bio),
    };

    setSaveAttempted(true);
    setFieldErrors(nextErrors);

    if (nextErrors.name || nextErrors.bio) {
      setSaveMessage('입력값을 확인해주세요.');
      toast.error('입력값을 확인해주세요.');
      return;
    }

    if (isNameChecking || isNameBlocked) {
      setSaveMessage('닉네임 중복 확인을 완료해 주세요.');
      toast.error('닉네임 중복 확인이 완료되지 않았습니다.');
      return;
    }

    try {
      setSaveMessage('저장 중...');
      let finalImageUrl: string | null | undefined = undefined;

      if (newProfileImageFile) {
        const uploadResult = await imageUploadMutation.mutateAsync(newProfileImageFile);
        finalImageUrl = uploadResult.publicUrl;
      }

      const normalizedFavoriteTeam = normalizeFavoriteTeam(editingFavoriteTeam);
      const updatedProfile: ProfileUpdateData = {
        name: name.trim(),
        favoriteTeam: normalizedFavoriteTeam === '없음' ? null : normalizedFavoriteTeam,
        email,
        bio: bio.trim() || undefined,
      };

      if (finalImageUrl) {
        updatedProfile.profileImageUrl = finalImageUrl;
      }

      await updateMutation.mutateAsync(updatedProfile);
    } catch (error) {
      setSaveMessage('저장 실패');
      console.error('프로필 저장 오류:', error);
    }
  };

  // ========== Cancel / Discard Handlers ==========
  const handleCancelRequest = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
      return;
    }
    onCancel();
  };

  const handleConfirmDiscard = (onConfirm?: () => void) => {
    setShowDiscardDialog(false);
    resetProfileState();
    if (onConfirm) {
      onConfirm();
      return;
    }
    onCancel();
  };

  const handleCloseDiscardDialog = () => {
    setShowDiscardDialog(false);
  };

  // ========== Team Selection ==========
  const handleTeamSelect = (teamId: string) => {
    setEditingFavoriteTeamState(normalizeFavoriteTeam(teamId));
    setShowTeamTest(false);
    setSaveMessage(null);
  };

  return {
    // State
    profileImage,
    name,
    setName: handleNameChange,
    email,
    setEmail,
    editingFavoriteTeam,
    setEditingFavoriteTeam: handleFavoriteTeamChange,
    bio,
    setBio: handleBioChange,
    nicknameCheckState,
    nicknameCheckMessage,
    showTeamTest,
    setShowTeamTest,
    fieldErrors,
    hasChanges,
    hasValidationErrors,
    saveAttempted,
    lastSavedAt,
    saveMessage,
    showDiscardDialog,

    // Loading
    isLoading,
    resetProfileState,

    // Handlers
    handleImageUpload,
    handleSave,
    handleTeamSelect,
    handleCancelRequest,
    handleConfirmDiscard,
    handleCloseDiscardDialog,
  };
};
