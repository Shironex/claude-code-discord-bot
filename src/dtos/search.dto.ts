import { StringOption } from 'necord';

export class SearchDto {
	@StringOption({
		name: 'query',
		description: 'Search query for repositories',
		required: true
	})
	query: string;
}