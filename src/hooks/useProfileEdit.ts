import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadProfileImage, updateProfile } from '../api/profile';
import { ProfileUpdateData } from '../types/profile';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

interface UseProfileEditProps {
  initialProfileImage: string;
  initialName: string;
  initialEmail: string;
  initialFavoriteTeam: string;
  onSave: () => void;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_NAME_LENGTH = 20;  // ✅ 추가

export const useProfileEdit = ({
  initialProfileImage,
  initialName,
  initialEmail,
  initialFavoriteTeam,
  onSave,
}: UseProfileEditProps) => {
  // ========== States ==========
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [editingFavoriteTeam, setEditingFavoriteTeam] = useState(initialFavoriteTeam);
  const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null);
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [nameError, setNameError] = useState('');  // ✅ 추가

  // ========== Image Upload Mutation ==========
  const imageUploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onError: (error: Error) => {
      toast.error(error.message || '이미지 업로드에 실패했습니다.');
    },
  });

  // ========== Profile Update Mutation ==========
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      return await updateProfile(data);
    },
    onSuccess: (response) => {
      // 토큰 업데이트
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }

      // Blob URL 해제
      if (profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }

      // ✅ AuthStore 동기화: favoriteTeam 업데이트
      const { setFavoriteTeam, setUserProfile, fetchProfileAndAuthenticate } = useAuthStore.getState();
      // 간단히 전체 프로필을 다시 fetch하여 동기화
      fetchProfileAndAuthenticate();

      setNewProfileImageFile(null);
      setNameError('');  // ✅ 추가: 성공 시 에러 초기화
      toast.success('변경사항이 적용되었습니다.');
      onSave();
    },
    onError: (error: Error) => {
      toast.error(error.message || '프로필 저장 중 오류가 발생했습니다.');
    },
  });

  // ========== Image Upload Handler ==========
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`파일 크기가 ${MAX_FILE_SIZE_MB}MB를 초과합니다.`);
      return;
    }

    // 파일 타입 체크
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
      return;
    }

    try {
      // 기존 Blob URL 해제
      if (profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }

      // 새 미리보기 생성
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      setNewProfileImageFile(file);

      toast.success('이미지가 선택되었습니다. 저장 버튼을 눌러주세요.');
    } catch (error) {
      console.error('이미지 미리보기 오류:', error);
      toast.error('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  // ========== Name Change Handler ✅ 추가 ==========
  const handleNameChange = (value: string) => {
    setName(value);
    // 입력 중 에러 초기화
    if (nameError) {
      setNameError('');
    }
  };

  // ========== Save Handler ==========
  const handleSave = async () => {
    // ✅ 닉네임 유효성 검사
    if (!name.trim()) {
      setNameError('이름(닉네임)은 필수로 입력해야 합니다.');
      toast.error('이름(닉네임)은 필수로 입력해야 합니다.');
      return;
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
      setNameError(`닉네임은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`);
      toast.error(`닉네임은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    // ✅ 검증 통과 시 에러 초기화
    setNameError('');

    try {
      let finalImageUrl: string | undefined = undefined;

      // 이미지 업로드 (있는 경우)
      if (newProfileImageFile) {
        const uploadResult = await imageUploadMutation.mutateAsync(newProfileImageFile);
        finalImageUrl = uploadResult.publicUrl;
      }

      // 프로필 업데이트 데이터 준비
      const updatedProfile: ProfileUpdateData = {
        name: name.trim(),
        favoriteTeam: editingFavoriteTeam === '없음' ? null : editingFavoriteTeam,
        email: email,
      };

      // 이미지 URL 추가 (업로드했거나 기존 URL 유지)
      if (finalImageUrl) {
        updatedProfile.profileImageUrl = finalImageUrl;
      } else if (newProfileImageFile === null && profileImage !== 'https://placehold.co/100x100/374151/ffffff?text=User') {
        updatedProfile.profileImageUrl = profileImage;
      }

      // 프로필 업데이트
      await updateMutation.mutateAsync(updatedProfile);
    } catch (error) {
      // 에러는 mutation에서 처리됨
      console.error('프로필 저장 오류:', error);
    }
  };

  // ========== Team Selection ==========
  const handleTeamSelect = (teamId: string) => {
    setEditingFavoriteTeam(teamId);
    setShowTeamTest(false);
  };

  return {
    // State
    profileImage,
    name,
    setName: handleNameChange,  // ✅ 수정
    email,
    setEmail,
    editingFavoriteTeam,
    setEditingFavoriteTeam,
    showTeamTest,
    setShowTeamTest,
    nameError,  // ✅ 추가

    // Loading
    isLoading: imageUploadMutation.isPending || updateMutation.isPending,

    // Handlers
    handleImageUpload,
    handleSave,
    handleTeamSelect,
  };
};