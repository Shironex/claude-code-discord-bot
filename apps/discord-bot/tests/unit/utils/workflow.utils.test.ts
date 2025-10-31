import { WorkflowUtils } from '@/utils/workflow.utils';

describe('WorkflowUtils', () => {
  describe('getWorkflowStatusEmoji', () => {
    describe('completed status with different conclusions', () => {
      it('should return success emoji for success conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'success');
        expect(emoji).toBe('✅');
      });

      it('should return failure emoji for failure conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'failure');
        expect(emoji).toBe('❌');
      });

      it('should return cancelled emoji for cancelled conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'cancelled');
        expect(emoji).toBe('🚫');
      });

      it('should return skipped emoji for skipped conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'skipped');
        expect(emoji).toBe('⏭️');
      });

      it('should return unknown emoji for unknown conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'unknown_conclusion');
        expect(emoji).toBe('❓');
      });

      it('should return unknown emoji for null conclusion', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', null);
        expect(emoji).toBe('❓');
      });
    });

    describe('non-completed status', () => {
      it('should return queued emoji for queued status', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('queued', null);
        expect(emoji).toBe('⏳');
      });

      it('should return in_progress emoji for in_progress status', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('in_progress', null);
        expect(emoji).toBe('🔄');
      });

      it('should return waiting emoji for waiting status', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('waiting', null);
        expect(emoji).toBe('⏸️');
      });

      it('should return unknown emoji for unknown status', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('unknown_status', null);
        expect(emoji).toBe('❓');
      });

      it('should return unknown emoji for empty status', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('', null);
        expect(emoji).toBe('❓');
      });
    });

    describe('edge cases', () => {
      it('should ignore conclusion when status is not completed', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('queued', 'success');
        expect(emoji).toBe('⏳');
      });

      it('should handle conclusion when status is completed', () => {
        const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'success');
        expect(emoji).toBe('✅');
      });
    });
  });

  describe('getWorkflowStatusText', () => {
    describe('completed status with different conclusions', () => {
      it('should return success text for success conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'success');
        expect(text).toBe('Completed Successfully');
      });

      it('should return failure text for failure conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'failure');
        expect(text).toBe('Failed');
      });

      it('should return cancelled text for cancelled conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'cancelled');
        expect(text).toBe('Cancelled');
      });

      it('should return skipped text for skipped conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'skipped');
        expect(text).toBe('Skipped');
      });

      it('should return default completed text for unknown conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'unknown_conclusion');
        expect(text).toBe('Completed');
      });

      it('should return default completed text for null conclusion', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', null);
        expect(text).toBe('Completed');
      });
    });

    describe('non-completed status', () => {
      it('should return queued text for queued status', () => {
        const text = WorkflowUtils.getWorkflowStatusText('queued', null);
        expect(text).toBe('Queued');
      });

      it('should return running text for in_progress status', () => {
        const text = WorkflowUtils.getWorkflowStatusText('in_progress', null);
        expect(text).toBe('Running');
      });

      it('should return waiting text for waiting status', () => {
        const text = WorkflowUtils.getWorkflowStatusText('waiting', null);
        expect(text).toBe('Waiting');
      });

      it('should return unknown text for unknown status', () => {
        const text = WorkflowUtils.getWorkflowStatusText('unknown_status', null);
        expect(text).toBe('Unknown');
      });

      it('should return unknown text for empty status', () => {
        const text = WorkflowUtils.getWorkflowStatusText('', null);
        expect(text).toBe('Unknown');
      });
    });

    describe('edge cases', () => {
      it('should ignore conclusion when status is not completed', () => {
        const text = WorkflowUtils.getWorkflowStatusText('queued', 'success');
        expect(text).toBe('Queued');
      });

      it('should handle conclusion when status is completed', () => {
        const text = WorkflowUtils.getWorkflowStatusText('completed', 'success');
        expect(text).toBe('Completed Successfully');
      });
    });
  });

  describe('method consistency', () => {
    it('should have consistent behavior between emoji and text methods for completed success', () => {
      const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'success');
      const text = WorkflowUtils.getWorkflowStatusText('completed', 'success');
      
      expect(emoji).toBe('✅');
      expect(text).toBe('Completed Successfully');
    });

    it('should have consistent behavior between emoji and text methods for failed', () => {
      const emoji = WorkflowUtils.getWorkflowStatusEmoji('completed', 'failure');
      const text = WorkflowUtils.getWorkflowStatusText('completed', 'failure');
      
      expect(emoji).toBe('❌');
      expect(text).toBe('Failed');
    });

    it('should have consistent behavior between emoji and text methods for in_progress', () => {
      const emoji = WorkflowUtils.getWorkflowStatusEmoji('in_progress', null);
      const text = WorkflowUtils.getWorkflowStatusText('in_progress', null);
      
      expect(emoji).toBe('🔄');
      expect(text).toBe('Running');
    });

    it('should have consistent behavior between emoji and text methods for unknown states', () => {
      const emoji = WorkflowUtils.getWorkflowStatusEmoji('unknown', null);
      const text = WorkflowUtils.getWorkflowStatusText('unknown', null);
      
      expect(emoji).toBe('❓');
      expect(text).toBe('Unknown');
    });
  });
});