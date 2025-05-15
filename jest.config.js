module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/test/__mocks__/obsidianMock.js'
  } //  
};