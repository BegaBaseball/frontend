export interface ManualBaseballDataMissingItem {
  key: string;
  label: string;
  reason: string;
  expected_format: string;
}

export interface ManualBaseballDataRequest {
  scope: string;
  missingItems: ManualBaseballDataMissingItem[];
  operatorMessage: string;
  blocking: boolean;
  code?: string;
}
