import { runDaeguOperatorReferencePhaseApproval } from './daegu-operator-reference-phase-approval.mjs';

const sourceContractLiterals = [
  '3-7',
  '3-6',
  '3-5',
  '3-4',
  '3-3',
  '3-2',
  '3-1',
  '1-5',
  '1-4',
  '1-3',
  '1-2',
  '1-1',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'DAEGU_OPERATOR_REFERENCE_P6_APPROVED_DRY_RUN_V1',
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedHitPath',
  'reviewer',
  'reviewedAt',
  'p6-approval-packet-ready',
  'p6-approval-gate-waiting-for-operator-input',
  'p6-approval-gate-dry-run-ready',
  'daegu-operator-reference-p6-dry-run-apply-plan.json',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
];

void sourceContractLiterals;

await runDaeguOperatorReferencePhaseApproval({ phase: 'p6' });
