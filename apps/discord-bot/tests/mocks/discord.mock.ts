// Jest globals are available in test environment
import type { 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  User,
  Client,
  Channel,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ModalBuilder
} from 'discord.js';

export const createMockUser = (overrides: Partial<User> = {}): Partial<User> => ({
  id: 'test-user-id',
  username: 'testuser',
  discriminator: '1234',
  tag: 'testuser#1234',
  ...overrides,
});

export const createMockInteraction = (
  overrides: Partial<ChatInputCommandInteraction> = {}
) => ({
  id: 'test-interaction-id',
  user: createMockUser() as User,
  member: null,
  guild: null,
  channel: null,
  channelId: 'test-channel-id',
  guildId: null,
  applicationId: 'test-app-id',
  commandName: 'test-command',
  commandId: 'test-command-id',
  commandType: 1,
  type: 2,
  token: 'test-token',
  version: 1,
  appPermissions: null,
  memberPermissions: null,
  locale: 'en-US',
  guildLocale: null,
  createdTimestamp: Date.now(),
  createdAt: new Date(),
  
  // Methods
  reply: jest.fn().mockResolvedValue(undefined),
  editReply: jest.fn().mockResolvedValue(undefined),
  followUp: jest.fn().mockResolvedValue(undefined),
  deferReply: jest.fn().mockResolvedValue(undefined),
  deleteReply: jest.fn().mockResolvedValue(undefined),
  fetchReply: jest.fn().mockResolvedValue(undefined),
  
  // State checks
  isRepliable: () => true,
  replied: false,
  deferred: false,
  ephemeral: null,
  
  // Options
  options: {
    getString: jest.fn(),
    getInteger: jest.fn(),
    getBoolean: jest.fn(),
    getUser: jest.fn(),
    getMember: jest.fn(),
    getChannel: jest.fn(),
    getRole: jest.fn(),
    getMentionable: jest.fn(),
    getNumber: jest.fn(),
    getAttachment: jest.fn(),
    getSubcommand: jest.fn(),
    getSubcommandGroup: jest.fn(),
    data: [],
    resolved: null,
  },
  
  inGuild: () => false,
  inCachedGuild: () => false,
  inRawGuild: () => false,
  
  ...overrides,
} as any);

export const createMockButtonInteraction = (
  overrides: Partial<ButtonInteraction> = {}
) => ({
  id: 'test-button-interaction-id',
  customId: 'test-button',
  componentType: 2,
  user: createMockUser() as User,
  member: null,
  guild: null,
  channel: null,
  channelId: 'test-channel-id',
  guildId: null,
  applicationId: 'test-app-id',
  type: 3,
  token: 'test-token',
  version: 1,
  appPermissions: null,
  memberPermissions: null,
  locale: 'en-US',
  guildLocale: null,
  createdTimestamp: Date.now(),
  createdAt: new Date(),
  
  // Methods
  reply: jest.fn().mockResolvedValue(undefined),
  editReply: jest.fn().mockResolvedValue(undefined),
  followUp: jest.fn().mockResolvedValue(undefined),
  deferReply: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  deferUpdate: jest.fn().mockResolvedValue(undefined),
  deleteReply: jest.fn().mockResolvedValue(undefined),
  fetchReply: jest.fn().mockResolvedValue(undefined),
  
  // State checks
  isRepliable: () => true,
  replied: false,
  deferred: false,
  ephemeral: null,
  
  inGuild: () => false,
  inCachedGuild: () => false,
  inRawGuild: () => false,
  
  ...overrides,
} as any);

export const createMockModalInteraction = (
  overrides: Partial<ModalSubmitInteraction> = {}
) => ({
  id: 'test-modal-interaction-id',
  customId: 'test-modal',
  user: createMockUser() as User,
  member: null,
  guild: null,
  channel: null,
  channelId: 'test-channel-id',
  guildId: null,
  applicationId: 'test-app-id',
  type: 5,
  token: 'test-token',
  version: 1,
  appPermissions: null,
  memberPermissions: null,
  locale: 'en-US',
  guildLocale: null,
  createdTimestamp: Date.now(),
  createdAt: new Date(),
  
  // Fields
  fields: {
    getTextInputValue: jest.fn().mockReturnValue('test-value'),
  },
  
  // Methods
  reply: jest.fn().mockResolvedValue(undefined),
  editReply: jest.fn().mockResolvedValue(undefined),
  followUp: jest.fn().mockResolvedValue(undefined),
  deferReply: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  deferUpdate: jest.fn().mockResolvedValue(undefined),
  deleteReply: jest.fn().mockResolvedValue(undefined),
  fetchReply: jest.fn().mockResolvedValue(undefined),
  
  // State checks
  isRepliable: () => true,
  replied: false,
  deferred: false,
  ephemeral: null,
  
  inGuild: () => false,
  inCachedGuild: () => false,
  inRawGuild: () => false,
  
  ...overrides,
} as any);

export const createMockSelectInteraction = (
  overrides: Partial<StringSelectMenuInteraction> = {}
) => ({
  id: 'test-select-interaction-id',
  customId: 'test-select',
  componentType: 3,
  user: createMockUser() as User,
  member: null,
  guild: null,
  channel: null,
  channelId: 'test-channel-id',
  guildId: null,
  applicationId: 'test-app-id',
  type: 3,
  token: 'test-token',
  version: 1,
  appPermissions: null,
  memberPermissions: null,
  locale: 'en-US',
  guildLocale: null,
  createdTimestamp: Date.now(),
  createdAt: new Date(),
  
  // Values
  values: ['test-value'],
  
  // Methods
  reply: jest.fn().mockResolvedValue(undefined),
  editReply: jest.fn().mockResolvedValue(undefined),
  followUp: jest.fn().mockResolvedValue(undefined),
  deferReply: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  deferUpdate: jest.fn().mockResolvedValue(undefined),
  deleteReply: jest.fn().mockResolvedValue(undefined),
  fetchReply: jest.fn().mockResolvedValue(undefined),
  
  // State checks
  isRepliable: () => true,
  replied: false,
  deferred: false,
  ephemeral: null,
  
  inGuild: () => false,
  inCachedGuild: () => false,
  inRawGuild: () => false,
  
  ...overrides,
} as any);

export const createMockClient = (overrides: Partial<Client> = {}) => ({
  login: jest.fn().mockResolvedValue('test-token'),
  destroy: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  channels: {
    fetch: jest.fn().mockResolvedValue(null),
    cache: new Map(),
  },
  guilds: {
    fetch: jest.fn().mockResolvedValue(null),
    cache: new Map(),
  },
  user: createMockUser() as User,
  readyAt: new Date(),
  uptime: 1000,
  
  ...overrides,
} as any);

export const createMockChannel = (overrides: Partial<TextChannel> = {}) => ({
  id: 'test-channel-id',
  type: 0,
  name: 'test-channel',
  send: jest.fn().mockResolvedValue(undefined),
  edit: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  
  ...overrides,
} as any);

export const createMockEmbed = () => ({
  setTitle: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setAuthor: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  setTimestamp: jest.fn().mockReturnThis(),
  setFooter: jest.fn().mockReturnThis(),
  setImage: jest.fn().mockReturnThis(),
  setThumbnail: jest.fn().mockReturnThis(),
  setURL: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
} as any);

export const createMockActionRow = () => ({
  addComponents: jest.fn().mockReturnThis(),
  setComponents: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
} as any);

export const createMockButton = () => ({
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setEmoji: jest.fn().mockReturnThis(),
  setDisabled: jest.fn().mockReturnThis(),
  setURL: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
} as any);

export const createMockSelectMenu = () => ({
  setCustomId: jest.fn().mockReturnThis(),
  setPlaceholder: jest.fn().mockReturnThis(),
  addOptions: jest.fn().mockReturnThis(),
  setOptions: jest.fn().mockReturnThis(),
  setMaxValues: jest.fn().mockReturnThis(),
  setMinValues: jest.fn().mockReturnThis(),
  setDisabled: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
} as any);

export const createMockModal = () => ({
  setCustomId: jest.fn().mockReturnThis(),
  setTitle: jest.fn().mockReturnThis(),
  addComponents: jest.fn().mockReturnThis(),
  setComponents: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
} as any);