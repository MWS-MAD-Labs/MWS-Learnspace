import { describe, expect, it, vi } from 'vitest';
import {
  createAuditService,
  sanitizeAuditMetadata,
} from '../service/audit-service.js';

describe('audit events', () => {
  it('accepts only strictly typed, bounded metadata', () => {
    expect(
      sanitizeAuditMetadata({
        reason: 'workflow transition',
        changedFields: ['state'],
        route: '/api/v1/ieps/:id',
        method: 'PATCH',
        source: 'iep-workflow',
      }),
    ).toEqual({
      reason: 'workflow transition',
      changedFields: ['state'],
      route: '/api/v1/ieps/:id',
      method: 'PATCH',
      source: 'iep-workflow',
    });
  });

  it('allows benign words that contain a prohibited substring', () => {
    expect(
      sanitizeAuditMetadata({ reason: 'addressed the learning goal' }),
    ).toEqual({ reason: 'addressed the learning goal' });
  });

  it('rejects nested values, unknown keys, and prohibited content', () => {
    expect(
      sanitizeAuditMetadata({ reason: { token: 'secret' } }),
    ).toBeUndefined();
    expect(
      sanitizeAuditMetadata({
        route: '/api/v1/ieps/:id',
        studentPayload: { phone: 'not-safe' },
      }),
    ).toBeUndefined();
    expect(
      sanitizeAuditMetadata({ reason: 'session token was copied' }),
    ).toBeUndefined();
  });

  it('exposes append-only event creation', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'event-id' });
    const service = createAuditService({
      auditEvent: { create },
    } as never);

    expect(Object.keys(service)).toEqual(['append']);
    await service.append({
      organizationId: 'organization-id',
      action: 'IEP_VIEWED',
      targetType: 'IEP',
      targetId: 'iep-id',
      requestId: 'request-id',
      result: 'SUCCEEDED',
      metadata: { route: '/api/v1/ieps/:id', method: 'GET' },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { route: '/api/v1/ieps/:id', method: 'GET' },
      }),
    });
  });
});
