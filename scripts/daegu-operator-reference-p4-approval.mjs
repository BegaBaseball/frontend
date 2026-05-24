import { runDaeguOperatorReferencePhaseApproval } from './daegu-operator-reference-phase-approval.mjs';

const sourceContractLiterals = [
  '1-12',
  '1-6',
  '3-12',
  '3-8',
  '1E-3',
  '1E-2',
  '1E-1',
  '3E-3',
  '3E-1',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'EXCLUDE_NON_SEAT',
  'DAEGU_OPERATOR_REFERENCE_P4_APPROVED_DRY_RUN_V1',
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedHitPath',
  'reviewer',
  'reviewedAt',
  'p4-approval-packet-ready',
  'p4-approval-gate-waiting-for-operator-input',
  'p4-approval-gate-dry-run-ready',
  'daegu-operator-reference-p4-dry-run-apply-plan.json',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'This packet creates 4096 operator-reference P4 infield/exciting review evidence only. It never writes src/data/daeguSeatData.ts.',
  'P4_OPERATOR_REFERENCE_INFIELD_EXCITING_IMAGE_LABEL_REVIEW',
  'MANUAL_SPLIT_FROM_IMAGE_COMPONENT',
  'RAPAK_REF_080',
  'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
];

void sourceContractLiterals;

await runDaeguOperatorReferencePhaseApproval({ phase: 'p4' });
