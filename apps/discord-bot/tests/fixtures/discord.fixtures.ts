// Discord-related test fixtures and data scenarios

export const discordUsers = {
  testUser: {
    id: 'test-user-id',
    username: 'testuser',
    discriminator: '1234',
    tag: 'testuser#1234',
    bot: false,
    system: false,
    flags: null,
    avatar: 'test-avatar-hash',
    banner: null,
    accentColor: null,
  },
  
  botUser: {
    id: 'bot-user-id',
    username: 'testbot',
    discriminator: '0000',
    tag: 'testbot#0000',
    bot: true,
    system: false,
    flags: null,
    avatar: 'bot-avatar-hash',
    banner: null,
    accentColor: null,
  },
};

export const discordChannels = {
  textChannel: {
    id: 'test-channel-id',
    type: 0, // GUILD_TEXT
    name: 'test-channel',
    topic: 'Test channel topic',
    nsfw: false,
    position: 0,
    parentId: null,
    rateLimitPerUser: 0,
  },
  
  dmChannel: {
    id: 'dm-channel-id',
    type: 1, // DM
    recipients: [discordUsers.testUser],
  },
};

export const discordGuilds = {
  testGuild: {
    id: 'test-guild-id',
    name: 'Test Guild',
    description: 'A test Discord server',
    icon: 'test-guild-icon-hash',
    banner: null,
    memberCount: 100,
    large: false,
    features: [],
    ownerId: 'guild-owner-id',
  },
};

export const interactionResponses = {
  basicReply: {
    embeds: [
      {
        title: 'Test Response',
        description: 'This is a test response',
        color: 0x3498db,
      },
    ],
    components: [],
    ephemeral: false,
  },
  
  ephemeralError: {
    embeds: [
      {
        title: '❌ Error',
        description: 'An error occurred during testing',
        color: 0xe74c3c,
      },
    ],
    ephemeral: true,
  },
  
  withButtons: {
    embeds: [
      {
        title: 'Action Required',
        description: 'Please select an action',
        color: 0xf39c12,
      },
    ],
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 1, // PRIMARY
            label: 'Confirm',
            customId: 'confirm-action',
          },
          {
            type: 2, // BUTTON
            style: 2, // SECONDARY
            label: 'Cancel',
            customId: 'cancel-action',
          },
        ],
      },
    ],
  },
  
  withSelectMenu: {
    embeds: [
      {
        title: 'Select Repository',
        description: 'Choose a repository from the list below',
        color: 0x9b59b6,
      },
    ],
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 3, // SELECT_MENU
            customId: 'repository-select',
            placeholder: 'Choose a repository...',
            minValues: 1,
            maxValues: 1,
            options: [
              {
                label: 'test-repo-1',
                value: 'testuser/test-repo-1',
                description: 'Test repository 1',
              },
              {
                label: 'test-repo-2',
                value: 'testuser/test-repo-2',
                description: 'Test repository 2',
              },
            ],
          },
        ],
      },
    ],
  },
};

export const modalData = {
  claudePrompt: {
    customId: 'claude-prompt',
    title: 'Claude Prompt',
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 4, // TEXT_INPUT
            customId: 'prompt-text',
            label: 'Your prompt for Claude',
            style: 2, // PARAGRAPH
            required: true,
            maxLength: 4000,
            placeholder: 'Enter your prompt here...',
          },
        ],
      },
    ],
  },
  
  repoSearch: {
    customId: 'claude-repo-search',
    title: 'Search Repositories',
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 4, // TEXT_INPUT
            customId: 'search-query',
            label: 'Search Query',
            style: 1, // SHORT
            required: true,
            maxLength: 100,
            placeholder: 'repository name...',
          },
        ],
      },
    ],
  },
};

export const buttonInteractionData = {
  cancel: {
    customId: 'cancel',
    componentType: 2,
  },
  
  claudePromptTrigger: {
    customId: 'claude-prompt-trigger',
    componentType: 2,
  },
  
  workflowStatus: {
    customId: 'workflow-status:123456789',
    componentType: 2,
  },
  
  addImages: {
    customId: 'add-images',
    componentType: 2,
  },
  
  skipImages: {
    customId: 'skip-images',
    componentType: 2,
  },
  
  skipFileSelection: {
    customId: 'skip-file-selection',
    componentType: 2,
  },
};

export const selectMenuInteractionData = {
  repositorySelect: {
    customId: 'repository-select',
    componentType: 3,
    values: ['testuser/test-repo'],
  },
  
  filePathSelect: {
    customId: 'file-path-select',
    componentType: 3,
    values: ['src/services/test.service.ts'],
  },
};

export const discordEmbedTemplates = {
  success: {
    color: 0x27ae60,
    title: '✅ Success',
    timestamp: new Date().toISOString(),
  },
  
  error: {
    color: 0xe74c3c,
    title: '❌ Error',
    timestamp: new Date().toISOString(),
  },
  
  info: {
    color: 0x3498db,
    title: 'ℹ️ Information',
    timestamp: new Date().toISOString(),
  },
  
  warning: {
    color: 0xf39c12,
    title: '⚠️ Warning',
    timestamp: new Date().toISOString(),
  },
  
  loading: {
    color: 0x95a5a6,
    title: '⏳ Loading...',
    timestamp: new Date().toISOString(),
  },
};