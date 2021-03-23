const { createLogger, format, transports } = require('winston');
const appRoot = require('app-root-path');

module.exports = createLogger({
    format: format.combine(
        format.simple(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(
            info => `[${info.timestamp} ${info.level} ${info.message}]`
        )
    ),
    transports: [
        new transports.File({
            maxFiles: 5,
            maxsize: 10000000,
            filename: `${appRoot}/logs/phoenix.log`
        }),
        new transports.Console({
            level: 'debug'
        })
    ]
});
