import { describe, expect, it } from 'vitest';
import { partnerDecisionSchema, signUpSchema } from '@aga/api-contracts';

const base = { email: 'a@example.com', password: 'longenough1' };

describe('signUpSchema', () => {
  it('accepts a plain user with defaults', () => {
    const r = signUpSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.role).toBe('user');
      expect(r.data.locale).toBe('el');
    }
  });

  it('rejects short passwords', () => {
    expect(signUpSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('requires business fields for partners', () => {
    const r = signUpSchema.safeParse({ ...base, role: 'partner' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => String(i.path[0]));
      expect(paths).toEqual(
        expect.arrayContaining([
          'businessName',
          'businessCategoryId',
          'businessPhone',
          'businessAddress',
        ]),
      );
    }
  });

  it('accepts a complete partner application', () => {
    const r = signUpSchema.safeParse({
      ...base,
      role: 'partner',
      businessName: 'Taverna',
      businessCategoryId: '00000000-0000-0000-0000-000000000001',
      businessPhone: '+30 2281 000000',
      businessAddress: 'Chora, Naxos',
    });
    expect(r.success).toBe(true);
  });
});

describe('partnerDecisionSchema', () => {
  it('does not allow linking a business on rejection', () => {
    const r = partnerDecisionSchema.safeParse({
      applicationId: '00000000-0000-0000-0000-000000000001',
      approve: false,
      existingBusinessId: '00000000-0000-0000-0000-000000000002',
    });
    expect(r.success).toBe(false);
  });
});
