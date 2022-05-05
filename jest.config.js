/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    Logger: {},
    UrlFetchApp: {},
    SpreadsheetApp: {},
    XmlService: {},
  },
  moduleDirectories: [
    'node_modules',
  ],
};