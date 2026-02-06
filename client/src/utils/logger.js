/* 
  Clean Logger Utility for Next.js / Node.js
  Supports:
  ✔ Timestamp
  ✔ Colored output
  ✔ Context labeling
  ✔ Pretty structured output
*/

const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
};

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, msg, context, data) {
  return {
    time: timestamp(),
    level,
    context,
    message: msg,
    ...(data ? { data } : {}),
  };
}

function print(level, color, msg, context = "APP", data = null) {
  const formatted = formatMessage(level, msg, context, data);
  const pretty = JSON.stringify(formatted, null, 2);

  console.log(`${color}[${level}]${COLORS.reset}`, pretty);
}

export const logger = {
  info(msg, context, data) {
    print("INFO", COLORS.blue, msg, context, data);
  },
  success(msg, context, data) {
    print("SUCCESS", COLORS.green, msg, context, data);
  },
  warn(msg, context, data) {
    print("WARN", COLORS.yellow, msg, context, data);
  },
  error(msg, context, data) {
    print("ERROR", COLORS.red, msg, context, data);
  },
};
