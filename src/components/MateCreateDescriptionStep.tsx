import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { FieldLabel } from './MateCreatePrimitives';
import type { MateCreateFormErrors, PartyFormData } from '../utils/mateCreateDraft';

interface MateCreateDescriptionStepProps {
  formData: PartyFormData;
  formErrors: MateCreateFormErrors;
  onDescriptionChange: (text: string) => void;
  onDescriptionBlur: () => void;
}

const STYLE_TAGS = ['#열정응원🔥', '#공격때_기립🧍', '#조용한관람🤫', '#먹방진심🍗', '#유니폼필수👕', '#직관승요🧚'];

export default function MateCreateDescriptionStep({
  formData,
  formErrors,
  onDescriptionChange,
  onDescriptionBlur,
}: MateCreateDescriptionStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-xl text-primary sm:mb-6 sm:text-2xl">
        파티 소개
      </h2>

      <div className="space-y-2">
        <FieldLabel htmlFor="description">소개글 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          onBlur={onDescriptionBlur}
          placeholder="함께 야구를 즐길 메이트에게 하고 싶은 말을 작성해주세요..."
          className="min-h-[150px]"
          aria-describedby="description-hint description-count"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {STYLE_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              className="text-[16px] px-2 py-1 bg-gray-100 dark:bg-card rounded-md text-gray-600 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/30 hover:text-primary transition-colors"
              onClick={() => {
                if (!formData.description.includes(tag)) {
                  onDescriptionChange(`${formData.description} ${tag}`.trim());
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-[16px] sm:flex-row sm:items-center sm:justify-between">
          <span
            id="description-hint"
            className={formErrors.description ? 'text-red-500' : 'text-gray-500'}
          >
            {formErrors.description || '10자 이상 200자 이하'}
          </span>
          <span
            id="description-count"
            className={
              formData.description.length > 190
                ? 'text-red-500 font-semibold'
                : formData.description.length > 160
                  ? 'text-amber-500'
                  : 'text-gray-500'
            }
            aria-live="polite"
            aria-atomic="true"
          >
            {formData.description.length}/200자
          </span>
        </div>
      </div>

      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-[16px]">
            <li>금칙어나 비방 표현은 사용할 수 없습니다</li>
            <li>전화번호, 이메일 등 연락처는 입력할 수 없습니다</li>
            <li>매칭 후 채팅을 통해 소통할 수 있습니다</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
