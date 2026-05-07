import ActivityLog from '@/models/ActivityLog';

interface LogOpts {
  tenantId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Fire-and-forget activity logger.
 * Never throws — failures are silently swallowed so they never block a response.
 */
export function logActivity(opts: LogOpts): void {
  ActivityLog.create({
    tenantId:  opts.tenantId,
    user:      opts.userId,
    action:    opts.action,
    entity:    opts.entity,
    entityId:  opts.entityId,
    details:   opts.details,
    ipAddress: opts.ipAddress,
  }).catch(() => {});
}
