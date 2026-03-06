const formatScope = (scope: string) => `[${scope}]`;

export const logInfo = (scope: string, message: string, extra?: unknown) => {
  if (!__DEV__) return;
  if (typeof extra === 'undefined') {
    console.log(formatScope(scope), message);
    return;
  }
  console.log(formatScope(scope), message, extra);
};

export const logWarn = (scope: string, message: string, extra?: unknown) => {
  if (!__DEV__) return;
  if (typeof extra === 'undefined') {
    console.warn(formatScope(scope), message);
    return;
  }
  console.warn(formatScope(scope), message, extra);
};

export const logError = (scope: string, message: string, extra?: unknown) => {
  if (!__DEV__) return;
  if (typeof extra === 'undefined') {
    console.error(formatScope(scope), message);
    return;
  }
  console.error(formatScope(scope), message, extra);
};
