import { DiscordUtils, createImageUploadPrompt } from '@/utils/discord.utils';
import { Repository } from '@/interfaces/models/repository.interface';
import { FileTreeItem } from '@/services/file-explorer.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { LANGUAGE_EMOJIS } from '@/utils/github.constants';
import { FileTreeUtils } from '@/utils/file-tree.utils';

// Create comprehensive mocks for Discord.js components
class MockStringSelectMenuBuilder {
  public data: any = { options: [], custom_id: undefined, placeholder: undefined };
  
  setCustomId(id: string) {
    this.data.custom_id = id;
    return this;
  }
  
  setPlaceholder(placeholder: string) {
    this.data.placeholder = placeholder;
    return this;
  }
  
  addOptions(options: any) {
    // Handle both single option and array of options
    if (Array.isArray(options)) {
      this.data.options.push(...options);
    } else {
      this.data.options.push(options);
    }
    return this;
  }
  
  setMinValues(min: number) {
    this.data.min_values = min;
    return this;
  }
  
  setMaxValues(max: number) {
    this.data.max_values = max;
    return this;
  }
}

class MockButtonBuilder {
  public data: any = { custom_id: undefined, label: undefined, style: undefined, url: undefined, emoji: undefined };
  
  setCustomId(id: string) {
    this.data.custom_id = id;
    return this;
  }
  
  setLabel(label: string) {
    this.data.label = label;
    return this;
  }
  
  setStyle(style: number) {
    this.data.style = style;
    return this;
  }
  
  setURL(url: string) {
    this.data.url = url;
    return this;
  }
  
  setEmoji(emoji: string) {
    this.data.emoji = emoji;
    return this;
  }
}

class MockActionRowBuilder {
  public components: any[] = [];
  
  addComponents(...components: any[]) {
    this.components.push(...components);
    return this;
  }
  
  setComponents(components: any[]) {
    this.components = components;
    return this;
  }
}

class MockEmbedBuilder {
  public data: any = {
    title: undefined,
    description: undefined,
    color: undefined,
    fields: [],
    footer: undefined,
    timestamp: undefined,
  };
  
  setTitle(title: string) {
    this.data.title = title;
    return this;
  }
  
  setDescription(description: string) {
    this.data.description = description;
    return this;
  }
  
  setColor(color: number) {
    this.data.color = color;
    return this;
  }
  
  addFields(fields: any) {
    if (Array.isArray(fields)) {
      this.data.fields.push(...fields);
    } else {
      this.data.fields.push(fields);
    }
    return this;
  }
  
  setFooter(footer: any) {
    this.data.footer = footer;
    return this;
  }
  
  setTimestamp(timestamp?: Date | number | boolean) {
    this.data.timestamp = timestamp === undefined ? new Date().toISOString() : timestamp;
    return this;
  }
}

// Mock discord.js
jest.mock('discord.js', () => ({
  StringSelectMenuBuilder: jest.fn().mockImplementation(() => new MockStringSelectMenuBuilder()),
  ButtonBuilder: jest.fn().mockImplementation(() => new MockButtonBuilder()),
  ActionRowBuilder: jest.fn().mockImplementation(() => new MockActionRowBuilder()),
  EmbedBuilder: jest.fn().mockImplementation(() => new MockEmbedBuilder()),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  },
  Colors: {
    Blue: 0x0099ff,
  },
}));

// Mock FileTreeUtils
jest.mock('@/utils/file-tree.utils');
const mockFileTreeUtils = FileTreeUtils as jest.Mocked<typeof FileTreeUtils>;

describe('DiscordUtils', () => {
  const mockRepository: Repository = {
    id: 123456,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    description: 'A test repository for testing',
    language: 'TypeScript',
    private: false,
    stargazersCount: 42,
    forksCount: 7,
    updatedAt: '2023-06-15T10:00:00Z',
    htmlUrl: 'https://github.com/testuser/test-repo',
  };

  const mockFileTreeItem: FileTreeItem = {
    path: 'src/services/github.service.ts',
    type: 'file',
    name: 'github.service.ts',
    size: 1234,
    isCommon: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup FileTreeUtils mocks
    mockFileTreeUtils.sortItemsForDisplay.mockImplementation((items) => [...items]);
    mockFileTreeUtils.getFileEmoji.mockReturnValue('📄');
    mockFileTreeUtils.createItemDescription.mockReturnValue('TypeScript service file');
  });

  describe('createRepositorySelectMenu', () => {
    it('should create select menu with correct structure', () => {
      const repositories = [mockRepository];
      
      const selectMenu = DiscordUtils.createRepositorySelectMenu(repositories);
      
      expect(selectMenu).toBeDefined();
      expect(selectMenu.data).toBeDefined();
      expect(selectMenu.data.custom_id).toBe(CUSTOM_IDS.REPO_SELECT);
      expect(selectMenu.data.placeholder).toBe('🔍 Choose a repository...');
      // Test that it has the expected structure without getting into type details
      expect(typeof selectMenu.addOptions).toBe('function');
      expect(typeof selectMenu.setCustomId).toBe('function');
    });

    it('should handle multiple repositories', () => {
      const repositories = [
        mockRepository,
        { ...mockRepository, id: 789, name: 'another-repo', fullName: 'testuser/another-repo', language: 'JavaScript' },
      ];
      
      const selectMenu = DiscordUtils.createRepositorySelectMenu(repositories);
      
      expect(selectMenu).toBeDefined();
      expect(selectMenu.data.options).toHaveLength(2);
    });

    it('should handle repositories without language', () => {
      const repoWithoutLanguage = { ...mockRepository, language: null };
      
      const selectMenu = DiscordUtils.createRepositorySelectMenu([repoWithoutLanguage]);
      
      expect(selectMenu).toBeDefined();
      expect(selectMenu.data.options).toHaveLength(1);
    });
  });

  describe('createSelectMenuRow', () => {
    it('should create action row with select menu', () => {
      const repositories = [mockRepository];
      
      const actionRow = DiscordUtils.createSelectMenuRow(repositories);
      
      expect(actionRow).toBeDefined();
      expect(actionRow.components).toHaveLength(1);
      expect(actionRow.components[0].data.custom_id).toBe(CUSTOM_IDS.REPO_SELECT);
    });
  });

  describe('formatRepositoryDescription', () => {
    it('should format repository description with all info', () => {
      const description = DiscordUtils.formatRepositoryDescription(mockRepository);
      
      expect(description).toContain('🔓'); // public repository
      expect(description).toContain('⭐ 42'); // stars
      expect(description).toContain('TypeScript'); // language
      expect(description).toContain('Updated:'); // updated date
    });

    it('should format private repository correctly', () => {
      const privateRepo = { ...mockRepository, private: true };
      
      const description = DiscordUtils.formatRepositoryDescription(privateRepo);
      
      expect(description).toContain('🔒');
    });

    it('should handle repository with no stars', () => {
      const repoWithNoStars = { ...mockRepository, stargazersCount: 0 };
      
      const description = DiscordUtils.formatRepositoryDescription(repoWithNoStars);
      
      expect(description).not.toContain('⭐');
    });

    it('should handle repository with no language', () => {
      const repoWithoutLanguage = { ...mockRepository, language: null };
      
      const description = DiscordUtils.formatRepositoryDescription(repoWithoutLanguage);
      
      expect(description).toContain('Unknown');
    });

    it('should format updated date correctly', () => {
      const description = DiscordUtils.formatRepositoryDescription(mockRepository);
      
      // Should contain a date in MM/DD/YYYY or DD/MM/YYYY format (locale dependent)
      expect(description).toMatch(/Updated: \d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('getLanguageEmoji', () => {
    it('should return correct emoji for known languages', () => {
      expect(DiscordUtils.getLanguageEmoji('TypeScript')).toBe(LANGUAGE_EMOJIS.TypeScript);
      expect(DiscordUtils.getLanguageEmoji('JavaScript')).toBe(LANGUAGE_EMOJIS.JavaScript);
      expect(DiscordUtils.getLanguageEmoji('Python')).toBe(LANGUAGE_EMOJIS.Python);
    });

    it('should return default emoji for unknown language', () => {
      expect(DiscordUtils.getLanguageEmoji('UnknownLanguage')).toBe('📁');
      expect(DiscordUtils.getLanguageEmoji(null)).toBe('📁');
      expect(DiscordUtils.getLanguageEmoji('')).toBe('📁');
    });
  });

  describe('createRepositoryFieldsForEmbed', () => {
    it('should create correct fields for embed', () => {
      const fields = DiscordUtils.createRepositoryFieldsForEmbed(mockRepository);
      
      expect(fields).toHaveLength(3);
      
      expect(fields[0]).toMatchObject({
        name: '📊 Stats',
        value: '⭐ 42 stars\n🍴 7 forks',
        inline: true,
      });
      
      expect(fields[1]).toMatchObject({
        name: '💻 Language',
        value: 'TypeScript',
        inline: true,
      });
      
      expect(fields[2]).toMatchObject({
        name: '🔗 Link',
        value: '[View on GitHub](https://github.com/testuser/test-repo)',
        inline: true,
      });
    });

    it('should handle repository without language', () => {
      const repoWithoutLanguage = { ...mockRepository, language: null };
      
      const fields = DiscordUtils.createRepositoryFieldsForEmbed(repoWithoutLanguage);
      
      expect(fields[1].value).toBe('Unknown');
    });
  });

  describe('Button creation methods', () => {
    it('should create workflow status button', () => {
      const button = DiscordUtils.createWorkflowStatusButton();
      
      expect(button).toBeDefined();
      expect((button.data as any).custom_id).toBe(CUSTOM_IDS.WORKFLOW_STATUS);
      expect((button.data as any).label).toBe('Check Status');
      expect(typeof button.setCustomId).toBe('function');
      expect(typeof button.setLabel).toBe('function');
    });

    it('should create view workflow button with URL', () => {
      const workflowUrl = 'https://github.com/testuser/test-repo/actions/runs/123456';
      
      const button = DiscordUtils.createViewWorkflowButton(workflowUrl);
      
      expect(button).toBeDefined();
      expect((button.data as any).url).toBe(workflowUrl);
      expect((button.data as any).label).toBe('View on GitHub');
      expect(typeof button.setURL).toBe('function');
    });

    it('should create cancel button', () => {
      const button = DiscordUtils.createCancelButton();
      
      expect(button).toBeDefined();
      expect((button.data as any).custom_id).toBe(CUSTOM_IDS.CANCEL);
      expect((button.data as any).label).toBe('Cancel');
      expect(typeof button.setCustomId).toBe('function');
    });

    it('should create skip file selection button', () => {
      const button = DiscordUtils.createSkipFileSelectionButton();
      
      expect(button).toBeDefined();
      expect((button.data as any).custom_id).toBe(CUSTOM_IDS.SKIP_FILE_SELECTION);
      expect((button.data as any).label).toBe('Skip File Selection');
      expect(typeof button.setCustomId).toBe('function');
    });

    it('should create add images button', () => {
      const button = DiscordUtils.createAddImagesButton();
      
      expect(button).toBeDefined();
      expect((button.data as any).custom_id).toBe(CUSTOM_IDS.ADD_IMAGES);
      expect((button.data as any).label).toBe('Add Images');
      expect(typeof button.setCustomId).toBe('function');
    });

    it('should create skip images button', () => {
      const button = DiscordUtils.createSkipImagesButton();
      
      expect(button).toBeDefined();
      expect((button.data as any).custom_id).toBe(CUSTOM_IDS.SKIP_IMAGES);
      expect((button.data as any).label).toBe('Skip Images');
      expect(typeof button.setCustomId).toBe('function');
    });
  });

  describe('createFileSelectMenu', () => {
    it('should create file select menu with file items', () => {
      const fileItems = [mockFileTreeItem];
      
      const selectMenu = DiscordUtils.createFileSelectMenu(fileItems);
      
      expect(selectMenu).toBeDefined();
      expect(selectMenu.data.options).toHaveLength(1);
      expect(selectMenu.data.custom_id).toBe(CUSTOM_IDS.FILE_PATH_SELECT);
      expect(selectMenu.data.placeholder).toBe('📁 Choose files/folders for context...');
      
      expect(mockFileTreeUtils.sortItemsForDisplay).toHaveBeenCalledWith(fileItems);
      expect(mockFileTreeUtils.getFileEmoji).toHaveBeenCalledWith(mockFileTreeItem);
      expect(mockFileTreeUtils.createItemDescription).toHaveBeenCalledWith(mockFileTreeItem);
    });

    it('should limit items to 25 due to Discord constraint', () => {
      const manyItems = Array.from({ length: 30 }, (_, i) => ({
        ...mockFileTreeItem,
        path: `file${i}.ts`,
        name: `file${i}.ts`,
      }));
      
      const selectMenu = DiscordUtils.createFileSelectMenu(manyItems);
      
      expect(selectMenu.data.options).toHaveLength(25);
    });

    it('should truncate long file names', () => {
      const longNameItem = {
        ...mockFileTreeItem,
        name: 'a'.repeat(105),
      };
      
      const selectMenu = DiscordUtils.createFileSelectMenu([longNameItem]);
      
      expect(selectMenu.data.options![0].label).toHaveLength(100);
      expect(selectMenu.data.options![0].label.endsWith('...')).toBe(true);
    });
  });

  describe('createFileSelectionComponents', () => {
    it('should create components with select menu and buttons when files exist', () => {
      const fileItems = [mockFileTreeItem];
      
      const components = DiscordUtils.createFileSelectionComponents(fileItems);
      
      expect(components).toHaveLength(2);
      expect(components[0].components).toHaveLength(1); // Select menu row
      expect(components[1].components).toHaveLength(2); // Button row
      
      // Verify select menu in first row
      expect((components[0].components[0].data as any).custom_id).toBe(CUSTOM_IDS.FILE_PATH_SELECT);
      
      // Verify buttons in second row
      expect((components[1].components[0].data as any).custom_id).toBe(CUSTOM_IDS.SKIP_FILE_SELECTION);
      expect((components[1].components[1].data as any).custom_id).toBe(CUSTOM_IDS.CANCEL);
    });

    it('should create only button row when no files exist', () => {
      const components = DiscordUtils.createFileSelectionComponents([]);
      
      expect(components).toHaveLength(1);
      expect(components[0].components).toHaveLength(2); // Skip and Cancel buttons
      
      // Verify buttons
      expect((components[0].components[0].data as any).custom_id).toBe(CUSTOM_IDS.SKIP_FILE_SELECTION);
      expect((components[0].components[1].data as any).custom_id).toBe(CUSTOM_IDS.CANCEL);
    });
  });

  describe('createImageUploadComponents', () => {
    it('should create image upload button row', () => {
      const components = DiscordUtils.createImageUploadComponents();
      
      expect(components).toHaveLength(1);
      expect(components[0].components).toHaveLength(3); // Add, Skip, Cancel buttons
      
      // Verify button custom IDs
      expect((components[0].components[0].data as any).custom_id).toBe(CUSTOM_IDS.ADD_IMAGES);
      expect((components[0].components[1].data as any).custom_id).toBe(CUSTOM_IDS.SKIP_IMAGES);
      expect((components[0].components[2].data as any).custom_id).toBe(CUSTOM_IDS.CANCEL);
    });
  });
});

describe('createImageUploadPrompt', () => {
  it('should create image upload prompt with embed and components', () => {
    const repositoryName = 'test-repo';
    
    const result = createImageUploadPrompt(repositoryName);
    
    expect(result.embed).toBeDefined();
    expect(result.embed.data.title).toBe('🖼️ Add Images to Context');
    expect(result.embed.data.color).toBe(0x0099ff); // Colors.Blue
    expect(result.embed.data.description).toContain(repositoryName);
    expect(result.embed.data.description).toContain('Would you like to add images');
    
    expect(result.embed.data.fields).toHaveLength(1);
    expect(result.embed.data.fields![0]).toMatchObject({
      name: '💡 Use Cases',
      value: expect.stringContaining('Screenshots'),
      inline: false,
    });
    
    expect(result.embed.data.footer?.text).toBe(
      'Images will be temporarily stored and automatically cleaned up after analysis'
    );
    expect(result.embed.data.timestamp).toBeDefined();
    
    expect(result.components).toHaveLength(1);
    expect(result.components[0].components).toHaveLength(3);
    
    // Verify button custom IDs
    expect((result.components[0].components[0].data as any).custom_id).toBe(CUSTOM_IDS.ADD_IMAGES);
    expect((result.components[0].components[1].data as any).custom_id).toBe(CUSTOM_IDS.SKIP_IMAGES);
    expect((result.components[0].components[2].data as any).custom_id).toBe(CUSTOM_IDS.CANCEL);
  });

  it('should handle empty repository name', () => {
    const result = createImageUploadPrompt('');
    
    expect(result.embed.data.description).toContain('**Repository:** ');
  });
});