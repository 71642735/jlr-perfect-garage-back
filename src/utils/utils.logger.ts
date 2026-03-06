import { createLogger, transports, format } from 'winston';

export const logInfo = createLogger({
	transports: [
		new transports.File({
			filename: './logs/perfect_garage_info_log',
			level: 'info',
			format: format.combine(
				format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
				format.printf(({ timestamp, message }) => {
					return `${timestamp} 'INFO': ${message}`;
				})
			),
		}),
	],
});

export const logError = createLogger({
	transports: [
		new transports.File({
			filename: './logs/perfect_garage_error_log',
			level: 'error',
			format: format.combine(
				format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
				format.printf(({ timestamp, message }) => {
					return `${timestamp} 'ERROR: ' ${message}`;
				})
			),
		}),
	],
});
