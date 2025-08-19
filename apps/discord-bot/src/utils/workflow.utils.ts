export class WorkflowUtils {
	static getWorkflowStatusEmoji(status: string, conclusion: string | null): string {
		if (status === 'completed') {
			switch (conclusion) {
				case 'success':
					return '✅';
				case 'failure':
					return '❌';
				case 'cancelled':
					return '🚫';
				case 'skipped':
					return '⏭️';
				default:
					return '❓';
			}
		}

		switch (status) {
			case 'queued':
				return '⏳';
			case 'in_progress':
				return '🔄';
			case 'waiting':
				return '⏸️';
			default:
				return '❓';
		}
	}

	static getWorkflowStatusText(status: string, conclusion: string | null): string {
		if (status === 'completed') {
			switch (conclusion) {
				case 'success':
					return 'Completed Successfully';
				case 'failure':
					return 'Failed';
				case 'cancelled':
					return 'Cancelled';
				case 'skipped':
					return 'Skipped';
				default:
					return 'Completed';
			}
		}

		switch (status) {
			case 'queued':
				return 'Queued';
			case 'in_progress':
				return 'Running';
			case 'waiting':
				return 'Waiting';
			default:
				return 'Unknown';
		}
	}
}
