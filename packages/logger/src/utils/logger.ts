// This is the first time I came accross something like this. We use winston to form logger functionality which is used used to log into console and a filw which is great. Use it using logger.info, logger.error, logger.warn...

import winston, {format, createLogger, transports} from "winston";
import { format as dateFormat, parseISO } from "date-fns";
import path from "path"

const { combine, timestamp, printf, colorize} = format

const customFormat = printf(({level, message, timestamp}) => {
    // TODO : Fix the type here
    return `[ ${formatTimestamp(timestamp as string)} ] -  ${level}  - ${message}`;
})

const logger = createLogger({
    level: "info",
    format: combine(colorize(), timestamp(), customFormat),

    transports: [
        new transports.Console(),
        new winston.transports.File({
            filename: path.join("logs", "server.log"),
        })
    ]
})

export { logger };

function formatTimestamp(timestamp?: string): string{
    if(!timestamp){
        return "Invalid timestamp";
    }
    try {
        const date = parseISO(timestamp);
        return dateFormat(date, "yyyy-MM-dd HH:mm:ss");
    }catch( error ){
        return "Invalid timestamp";
    }
}

export default formatTimestamp;