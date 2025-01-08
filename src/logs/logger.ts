import fs from "fs";
import path from "path";
import { config } from "../config/config";

enum LogLevel {
  INFO = "info",
  ERROR = "error",
  WARN = "warn",
  CRITICAL = "critical",
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  private writeLog(level: LogLevel, message: string): void {
    const logMessage = `${this.getTimestamp()} [${level}] ${message}\n`;
    const logFile = path.join(config.logPath, `${level}.log`);

    if (!fs.existsSync(config.logPath)) {
      fs.mkdirSync(config.logPath, { recursive: true });
    }

    fs.appendFileSync(logFile, logMessage);
  }

  info(message: string): void {
    console.info(message);
    this.writeLog(LogLevel.INFO, message);
  }

  error(message: string): void {
    console.error(message);
    this.writeLog(LogLevel.ERROR, message);
  }

  warn(message: string): void {
    console.warn(message);
    this.writeLog(LogLevel.WARN, message);
  }

  critical(message: string): void {
    console.log(message);
    this.writeLog(LogLevel.CRITICAL, message);
  }
}

export default new Logger();
