import { describe, expect, it } from 'vitest';
import { resolveHotelFeatures } from './hotel-features';

describe('resolveHotelFeatures', () => {
  it('falls back to the package when no flags exist', () => {
    expect(resolveHotelFeatures('basic', []).llmChat).toBe(false);
    expect(resolveHotelFeatures('professional', []).llmChat).toBe(true);
    expect(resolveHotelFeatures('advanced', []).partnerConnections).toBe(true);
  });

  it('lets a per-hotel flag switch a feature on for a lower package', () => {
    const rows = [{ hotel_id: 'h-1', flag: 'llm_chat', enabled: true }];
    expect(resolveHotelFeatures('basic', rows).llmChat).toBe(true);
  });

  it('lets a per-hotel flag switch a feature off for a higher package', () => {
    const rows = [{ hotel_id: 'h-1', flag: 'partner_connections', enabled: false }];
    expect(resolveHotelFeatures('enterprise', rows).partnerConnections).toBe(false);
    expect(resolveHotelFeatures('enterprise', rows).llmChat).toBe(true);
  });

  it('ignores global default rows (packages decide, not the legacy default)', () => {
    const rows = [{ hotel_id: null, flag: 'llm_chat', enabled: false }];
    expect(resolveHotelFeatures('professional', rows).llmChat).toBe(true);
  });

  it('ignores flags it does not know', () => {
    const rows = [{ hotel_id: 'h-1', flag: 'something_else', enabled: true }];
    expect(resolveHotelFeatures('basic', rows)).toEqual(resolveHotelFeatures('basic', []));
  });
});
