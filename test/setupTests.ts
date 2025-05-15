import { App, TFile, Vault, MetadataCache } from 'obsidian';

// Jest es un framework de pruebas para JavaScript/TypeScript que ofrece:
// 1. Runner de pruebas: ejecuta tests en paralelo
// 2. Assertions: valida resultados esperados con expect()
// 3. Mocks: simula comportamientos de módulos y funciones
// 4. Snapshots: guarda "fotos" del estado para comparar cambios
// 5. Coverage: reporta qué código está cubierto por pruebas

// Mock Obsidian APIs
jest.mock('obsidian', () => {
  // Create mock implementations for Obsidian classes and interfaces
  const mockApp = {
    vault: {
      getMarkdownFiles: jest.fn().mockReturnValue([]),
      read: jest.fn().mockResolvedValue(''),
      adapter: {
        exists: jest.fn().mockResolvedValue(true),
        read: jest.fn().mockResolvedValue(''),
        write: jest.fn().mockResolvedValue(undefined)
      }
    },
    metadataCache: {
      getFileCache: jest.fn().mockReturnValue(null)
    },
    workspace: {
      getActiveFile: jest.fn().mockReturnValue(null),
      getActiveViewOfType: jest.fn().mockReturnValue(null)
    }
  };

  const mockTFile = function(this: any, path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^.]+$/, '');
    this.extension = this.name.includes('.') ? this.name.split('.').pop() : '';
  };

  return {
    App: jest.fn().mockImplementation(() => mockApp),
    TFile: jest.fn().mockImplementation(function(this: any, path: string) {
      return new (mockTFile as any)(path);
    }),
    Vault: jest.fn(),
    MetadataCache: jest.fn(),
    // Add other Obsidian APIs as needed
    MarkdownView: jest.fn(),
    PluginSettingTab: jest.fn(),
    Setting: jest.fn().mockReturnValue({
      setName: jest.fn().mockReturnThis(),
      setDesc: jest.fn().mockReturnThis(),
      addText: jest.fn().mockReturnValue({
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      }),
      addToggle: jest.fn().mockReturnValue({
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      }),
      addDropdown: jest.fn().mockReturnValue({
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      })
    })
  };
});

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  debug: jest.fn(),
  log: jest.fn(),
  // Keep error for debugging
  error: console.error,
  warn: jest.fn()
};

// Create helper functions for testing
export const createMockFile = (path: string, content: string = ''): TFile => {
  const file = new (TFile as any)(path);
  (App as any).mockImplementation(() => ({
    vault: {
      getMarkdownFiles: jest.fn().mockReturnValue([file]),
      read: jest.fn().mockResolvedValue(content),
    },
    metadataCache: {
      getFileCache: jest.fn().mockReturnValue({
        listItems: []
      })
    }
  }));
  return file;
};

// Ejemplos de métodos comunes de Jest:
// 
// describe('Grupo de tests', () => {            // Agrupa tests relacionados
//   beforeEach(() => { /* preparación */ });    // Ejecuta antes de cada test
//   afterEach(() => { /* limpieza */ });        // Ejecuta después de cada test
//   
//   test('prueba algo', () => {                 // Define un caso de prueba
//     expect(2 + 2).toBe(4);                    // Aserción simple
//     expect({ name: 'task' }).toEqual({ name: 'task' }); // Compara objetos
//     expect(() => { throw new Error() }).toThrow(); // Verifica excepciones
//   });
// 
//   it('es sinónimo de test', async () => {     // También se puede usar 'it'
//     const data = await someAsyncFunction();   // Maneja código asíncrono
//     expect(data).toBeDefined();
//   });
// });

// Funciones de mocks con Jest:
// const mockFn = jest.fn();                    // Crea una función mock
// mockFn.mockReturnValue(10);                  // Define valor de retorno
// mockFn.mockImplementation(() => 'result');   // Define implementación
// expect(mockFn).toHaveBeenCalled();           // Verifica que fue llamada
// expect(mockFn).toHaveBeenCalledWith(arg);    // Verifica argumentos
// jest.spyOn(object, 'method');                // Espía un método existente

// Add Jest environment setup if needed
beforeAll(() => {
  // Setup code to run before all tests
  jest.useFakeTimers();  // Opcional: controla temporizadores en tests
});

afterAll(() => {
  // Cleanup code to run after all tests
  jest.useRealTimers();  // Restaura temporizadores reales
});

// Para ejecutar tests específicos:
// - npm test -- -t "nombre del test"    (ejecuta tests con nombre específico)
// - npm test -- --watch                 (modo vigilancia, re-ejecuta al cambiar)
// - npm test -- --coverage              (genera reporte de cobertura)

// INSTALACIÓN Y CONFIGURACIÓN DE JEST:
// 1. Instalar Jest y TypeScript support:
//    npm install --save-dev jest @types/jest ts-jest
//
// 2. Crear un archivo jest.config.js en la raíz del proyecto:
//    module.exports = {
//      preset: 'ts-jest',
//      testEnvironment: 'node',
//      setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
//      moduleNameMapper: {
//        '^obsidian$': '<rootDir>/test/__mocks__/obsidianMock.js'
//      }
//    };
//
// 3. Añadir script en package.json:
//    "scripts": {
//      "test": "jest",
//      "test:watch": "jest --watch",
//      "test:coverage": "jest --coverage"
//    }
//
// 4. Ejecutar tests con: npm test
