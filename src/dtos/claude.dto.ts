import { StringOption } from 'necord';

export class ClaudeDto {
	@StringOption({
		name: 'repository',
		description: 'Repository to analyze (format: owner/repo)',
		required: true
	})
	repository: string;

	@StringOption({
		name: 'prompt',
		description: 'What would you like Claude to do with this repository?',
		required: true
	})
	prompt: string;

	@StringOption({
		name: 'branch',
		description: 'Branch to run Claude on (defaults to main)',
		required: false
	})
	branch?: string;
}
