import { useEffect, useMemo, useState } from 'react';
import {
  createInitialMateCreateFormErrors,
  createInitialPartyFormData,
  isMateCreateDraftEmpty,
  MATE_CREATE_DRAFT_STORAGE_KEY,
  readMateCreateDraft,
  serializeMateCreateDraft,
  type MateCreateFormErrors,
  type PartyFormData,
} from '../utils/mateCreateDraft';

const loadInitialDraft = (): {
  createStep: 1 | 2 | 3 | 4;
  formData: PartyFormData;
} => {
  if (typeof window === 'undefined') {
    return {
      createStep: 1,
      formData: createInitialPartyFormData(),
    };
  }

  return readMateCreateDraft(window.sessionStorage.getItem(MATE_CREATE_DRAFT_STORAGE_KEY));
};

export const useMateCreateDraft = () => {
  const initialDraft = useMemo(loadInitialDraft, []);
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(initialDraft.createStep);
  const [formData, setFormData] = useState<PartyFormData>(initialDraft.formData);
  const [formErrors, setFormErrors] = useState<MateCreateFormErrors>(createInitialMateCreateFormErrors);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isMateCreateDraftEmpty(createStep, formData)) {
      window.sessionStorage.removeItem(MATE_CREATE_DRAFT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      MATE_CREATE_DRAFT_STORAGE_KEY,
      serializeMateCreateDraft(createStep, formData),
    );
  }, [createStep, formData]);

  return {
    createStep,
    formData,
    formErrors,
    setCreateStep,
    updateFormData: (data: Partial<PartyFormData>) => {
      setFormData((current) => ({ ...current, ...data }));
    },
    setFormError: (field: keyof MateCreateFormErrors, error: string) => {
      setFormErrors((current) => ({ ...current, [field]: error }));
    },
    resetForm: () => {
      setCreateStep(1);
      setFormData(createInitialPartyFormData());
      setFormErrors(createInitialMateCreateFormErrors());
    },
  };
};

export type UseMateCreateDraftReturn = ReturnType<typeof useMateCreateDraft>;
