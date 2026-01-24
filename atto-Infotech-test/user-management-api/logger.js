const { createLogger, format, transports } = require("winston");

/**
 * Winston logger configuration.
 * This logger is used to log messages to both the console and files.
 * It supports different log levels and formats logs in JSON with timestamps.
 */
const logger = createLogger({
  level: "info", // Minimum log level to capture (e.g., 'info', 'error', 'debug')
  format: format.combine(
    format.timestamp(), // Add a timestamp to each log entry
    format.json(), // Format logs as JSON
  ),
  transports: [
    // Log to the console
    new transports.Console({
      format: format.combine(
        format.colorize(), // Add colors to console logs
        format.simple(), // Use a simple format for console output
      ),
    }),

    // Log errors to a separate file
    new transports.File({
      filename: "logs/error.log", // File to store error logs
      level: "error", // Only log errors to this file
    }),

    // Log all messages to a combined file
    new transports.File({
      filename: "logs/combined.log", // File to store all logs
    }),
  ],
});

// Log a message when the logger is initialized
logger.info("Logger initialized successfully.");

module.exports = logger;
