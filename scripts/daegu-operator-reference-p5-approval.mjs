import { runDaeguOperatorReferencePhaseApproval } from './daegu-operator-reference-phase-approval.mjs';

const sourceContractLiterals = [
  'VIP-3',
  'VIP-2',
  'VIP-1',
  'TC-3',
  'TC-2',
  'TC-1',
  'T3-4',
  'T3-1',
  'T1-4',
  'T1-1',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'DAEGU_OPERATOR_REFERENCE_P5_APPROVED_DRY_RUN_V1',
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedHitPath',
  'reviewer',
  'reviewedAt',
  'p5-approval-packet-ready',
  'p5-approval-gate-waiting-for-operator-input',
  'p5-approval-gate-dry-run-ready',
  'daegu-operator-reference-p5-dry-run-apply-plan.json',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
];

void sourceContractLiterals;

await runDaeguOperatorReferencePhaseApproval({ phase: 'p5' });
