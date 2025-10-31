// Jest globals are available in test environment

export const createMockWinstonLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  profile: jest.fn(),
  startTimer: jest.fn(),
  query: jest.fn(),
  stream: jest.fn(),
  close: jest.fn(),
  handleExceptions: jest.fn(),
  unhandleExceptions: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
  setLevel: jest.fn(),
});

export const createMockWinstonTransport = () => ({
  log: jest.fn(),
  query: jest.fn(),
  stream: jest.fn(),
  close: jest.fn(),
  handleExceptions: jest.fn(),
  unhandleExceptions: jest.fn(),
});

// Mock winston-daily-rotate-file transport
export const createMockDailyRotateFile = () => ({
  ...createMockWinstonTransport(),
  rotate: jest.fn(),
  getLogFilePath: jest.fn().mockReturnValue('/tmp/test.log'),
  filename: '/tmp/test-%DATE%.log',
  dirname: '/tmp',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
});

// Mock the winston-daily-rotate-file module
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => createMockDailyRotateFile());
});