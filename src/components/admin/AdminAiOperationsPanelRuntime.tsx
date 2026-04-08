import type { ComponentProps } from 'react';

import { AdminAiOperationsPanel } from './AdminAiOperationsPanel';

type AdminAiOperationsPanelRuntimeProps = ComponentProps<typeof AdminAiOperationsPanel>;

export default function AdminAiOperationsPanelRuntime(
  props: AdminAiOperationsPanelRuntimeProps,
) {
  return <AdminAiOperationsPanel {...props} />;
}
