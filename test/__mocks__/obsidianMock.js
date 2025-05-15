module.exports = {
    getMarkdownFiles: jest.fn(() => Promise.resolve([])),
    getFile: jest.fn((fileName) => Promise.resolve({ name: fileName, content: '' })),
    saveFile: jest.fn((fileName, content) => Promise.resolve({ name: fileName, content })),
    on: jest.fn(),
    off: jest.fn(),
};