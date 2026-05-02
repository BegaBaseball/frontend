import type { ComponentProps } from 'react';

import { AdminCoachAutoBriefOpsPanel } from './AdminCoachAutoBriefOpsPanel';

type AdminCoachAutoBriefOpsPanelRuntimeProps = ComponentProps<typeof AdminCoachAutoBriefOpsPanel>;

export default function AdminCoachAutoBriefOpsPanelRuntime(
  props: AdminCoachAutoBriefOpsPanelRuntimeProps,
) {
  return <AdminCoachAutoBriefOpsPanel {...props} />;
}
