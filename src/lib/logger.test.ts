import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, Logger, LogLevel, LogEntry } from './logger';

// Mock window.api
const mockWriteLog = vi.fn(() => Promise.resolve());

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteLog.mockReturnValue(Promise.resolve());
    // Reset logger state
    logger.clearBuffer();
    logger.setLevel(LogLevel.DEBUG);

    // Mock window.api
    (global.window as any) = {
      api: {
        writeLog: mockWriteLog,
      },
    };

    // Spy on console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global.window as any).api;
  });

  describe('Log Level Filtering', () => {
    it('should log DEBUG messages when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('test', 'Debug message');

      expect(console.debug).toHaveBeenCalled();
    });

    it('should not log DEBUG messages when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('test', 'Debug message');

      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should log INFO messages when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test', 'Info message');

      expect(console.info).toHaveBeenCalled();
    });

    it('should not log INFO messages when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('test', 'Info message');

      expect(console.info).not.toHaveBeenCalled();
    });

    it('should log WARN messages when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn('test', 'Warning message');

      expect(console.warn).toHaveBeenCalled();
    });

    it('should log ERROR messages at any level', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error('test', 'Error message');

      expect(console.error).toHaveBeenCalled();
    });

    it('should log ERROR messages even at DEBUG level', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.error('test', 'Error message');

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Log Buffer Management', () => {
    it('should add logs to buffer', () => {
      logger.debug('test', 'Message 1');
      logger.info('test', 'Message 2');

      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Message 1');
      expect(logs[1].message).toBe('Message 2');
    });

    it('should maintain max buffer size of 1000 entries', () => {
      // Add 1100 log entries
      for (let i = 0; i < 1100; i++) {
        logger.info('test', `Message ${i}`);
      }

      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1000);
      // Should have removed oldest entries (0-99)
      expect(logs[0].message).toBe('Message 100');
      expect(logs[999].message).toBe('Message 1099');
    });

    it('should implement circular buffer correctly', () => {
      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        logger.info('test', `Message ${i}`);
      }

      // Add one more to trigger circular behavior
      logger.info('test', 'New Message');

      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[0].message).toBe('Message 1');
      expect(logs[999].message).toBe('New Message');
    });

    it('should clear buffer', () => {
      logger.info('test', 'Message 1');
      logger.info('test', 'Message 2');

      expect(logger.getRecentLogs()).toHaveLength(2);

      logger.clearBuffer();

      expect(logger.getRecentLogs()).toHaveLength(0);
    });
  });

  describe('getRecentLogs()', () => {
    beforeEach(() => {
      logger.clearBuffer();
      logger.info('test', 'Message 1');
      logger.info('test', 'Message 2');
      logger.info('test', 'Message 3');
      logger.info('test', 'Message 4');
      logger.info('test', 'Message 5');
    });

    it('should return all logs when no count specified', () => {
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(5);
    });

    it('should return last N logs when count specified', () => {
      const logs = logger.getRecentLogs(3);
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 3');
      expect(logs[1].message).toBe('Message 4');
      expect(logs[2].message).toBe('Message 5');
    });

    it('should return all logs if count exceeds buffer size', () => {
      const logs = logger.getRecentLogs(100);
      expect(logs).toHaveLength(5);
    });

    it('should return empty array for empty buffer', () => {
      logger.clearBuffer();
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(0);
    });

    it('should return copies of log entries, not references', () => {
      const logs1 = logger.getRecentLogs();
      const logs2 = logger.getRecentLogs();

      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('setLevel() and getLevel()', () => {
    it('should set and get log level', () => {
      logger.setLevel(LogLevel.INFO);
      expect(logger.getLevel()).toBe(LogLevel.INFO);

      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });

    it('should start at DEBUG level by default in development', () => {
      // Logger is initialized at import time
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('Log Formatting', () => {
    it('should format logs with timestamp, level, category, and message', () => {
      logger.info('api', 'Request started');

      const logs = logger.getRecentLogs();
      expect(logs[0]).toMatchObject({
        level: 'INFO',
        category: 'api',
        message: 'Request started',
      });
      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].data).toBeUndefined();
    });

    it('should include data when provided', () => {
      const testData = { userId: 123, action: 'login' };
      logger.info('auth', 'User logged in', testData);

      const logs = logger.getRecentLogs();
      expect(logs[0].data).toEqual(testData);
    });

    it('should handle undefined data gracefully', () => {
      logger.info('test', 'Message without data', undefined);

      const logs = logger.getRecentLogs();
      expect(logs[0].data).toBeUndefined();
    });

    it('should handle complex data objects', () => {
      const complexData = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        nullValue: null,
      };

      logger.info('test', 'Complex data', complexData);

      const logs = logger.getRecentLogs();
      expect(logs[0].data).toEqual(complexData);
    });
  });

  describe('IPC writeLog Integration', () => {
    it('should call window.api.writeLog when available', () => {
      logger.info('test', 'Test message');

      expect(mockWriteLog).toHaveBeenCalled();
      expect(mockWriteLog).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [test] Test message')
      );
    });

    it('should include data in log line when provided', () => {
      logger.info('test', 'Test message', { key: 'value' });

      expect(mockWriteLog).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"}')
      );
    });

    it('should handle writeLog API not being available', () => {
      delete (global.window as any).api;

      // Should not throw error
      expect(() => {
        logger.info('test', 'Test message');
      }).not.toThrow();
    });

    it('should handle writeLog rejecting promise', async () => {
      mockWriteLog.mockRejectedValueOnce(new Error('Write failed'));

      // Should not throw error (error is caught internally)
      logger.info('test', 'Test message');

      // Wait for promise rejection to be handled
      await vi.waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to write log to file:',
          expect.any(Error)
        );
      });
    });

    it('should format timestamp in ISO format', () => {
      logger.info('test', 'Test message');

      const logs = logger.getRecentLogs();
      const timestamp = logs[0].timestamp;

      // ISO 8601 format validation
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Console Output', () => {
    it('should call console.debug for DEBUG level', () => {
      logger.debug('test', 'Debug message');

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [test]'),
        'Debug message',
        ''
      );
    });

    it('should call console.info for INFO level', () => {
      logger.info('test', 'Info message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [test]'),
        'Info message',
        ''
      );
    });

    it('should call console.warn for WARN level', () => {
      logger.warn('test', 'Warning message');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [test]'),
        'Warning message',
        ''
      );
    });

    it('should call console.error for ERROR level', () => {
      logger.error('test', 'Error message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test]'),
        'Error message',
        ''
      );
    });

    it('should include data in console output when provided', () => {
      const testData = { error: 'Something went wrong' };
      logger.error('test', 'Error occurred', testData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test]'),
        'Error occurred',
        testData
      );
    });
  });

  describe('Log Entry Structure', () => {
    it('should create valid LogEntry objects', () => {
      logger.info('category', 'message', { data: 'value' });

      const logs = logger.getRecentLogs();
      const entry = logs[0];

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('category');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('data');

      expect(typeof entry.timestamp).toBe('string');
      expect(typeof entry.level).toBe('string');
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.message).toBe('string');
    });

    it('should not include data field when no data provided', () => {
      logger.info('test', 'message');

      const logs = logger.getRecentLogs();
      expect(logs[0].data).toBeUndefined();
    });
  });

  describe('Multiple Log Levels', () => {
    it('should respect different log levels for different calls', () => {
      logger.setLevel(LogLevel.INFO);

      logger.debug('test', 'Debug');    // Should not log
      logger.info('test', 'Info');       // Should log
      logger.warn('test', 'Warn');       // Should log
      logger.error('test', 'Error');     // Should log

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();

      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(3); // Only INFO, WARN, ERROR
    });
  });
});
