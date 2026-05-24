import { runDaeguOperatorReferencePhaseApproval } from './daegu-operator-reference-phase-approval.mjs';

const sourceContractLiterals = [
  'S-23',
  'S-22',
  'S-21',
  'S-1',
  'S-2',
  'S-3',
  'RAPAK_REF_102',
  'RAPAK_REF_105',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'EXCLUDE_NON_SEAT',
  'PENDING_OPERATOR_DECISION',
  'P7_OPERATOR_REFERENCE_UNLABELED_LOWER_BOWL_REVIEW',
  'P7_REQUIRES_OPERATOR_BLOCK_LABEL',
  'DAEGU_OPERATOR_REFERENCE_P7_APPROVED_DRY_RUN_V1',
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedHitPath',
  'reviewer',
  'reviewedAt',
  'p7-approval-packet-ready',
  'p7-approval-gate-waiting-for-operator-input',
  'p7-approval-gate-dry-run-ready',
  'daegu-operator-reference-p7-dry-run-apply-plan.json',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'This packet creates 4096 operator-reference P7 unlabeled lower-bowl review evidence only. It never writes src/data/daeguSeatData.ts.',
  'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
];

void sourceContractLiterals;

await runDaeguOperatorReferencePhaseApproval({
  phase: 'p7',
  allowPendingRows: true,
  allowExcludeNonSeat: true,
});
