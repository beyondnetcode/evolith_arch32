import { createTransitionEvent } from './phase-transition.model';

describe('createTransitionEvent', () => {
  it('should approve sequential transition with score >= 80', () => {
    const evt = createTransitionEvent(1, 2, 85);
    expect(evt.approved).toBe(true);
    expect(evt.rejectionReason).toBeUndefined();
  });
  it('should reject non-sequential transition', () => {
    const evt = createTransitionEvent(1, 3, 90);
    expect(evt.approved).toBe(false);
    expect(evt.rejectionReason).toBeDefined();
  });
  it('should reject when score below 80', () => {
    const evt = createTransitionEvent(2, 3, 75);
    expect(evt.approved).toBe(false);
  });
});
