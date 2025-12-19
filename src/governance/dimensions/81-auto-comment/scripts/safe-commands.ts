const UNSAFE_PATTERN = /[;&|`$><()\\]/;

function stripWrappingQuotes(value: string): string {
  if (!value) return value;

  const first = value[0];
  if ((first === "'" || first === '"') && value.endsWith(first)) {
    return value.slice(1, -1);
  }
  return value;
}

function parseSegment(segment: string): string[] {
  if (UNSAFE_PATTERN.test(segment)) {
    throw new Error(`Unsafe command rejected: ${segment}`);
  }

  const trimmed = segment.trim();
  switch (trimmed) {
    case "git status --porcelain":
      return ["git", "status", "--porcelain"];
    case "git add .":
      return ["git", "add", "."];
    case "git rev-parse HEAD":
      return ["git", "rev-parse", "HEAD"];
    case "npm run lint":
      return ["npm", "run", "lint"];
    case "npm run build":
      return ["npm", "run", "build"];
    case "npm test":
      return ["npm", "test"];
    case "npm run type-check":
      return ["npm", "run", "type-check"];
    case "npm run format":
      return ["npm", "run", "format"];
    case "npx eslint --fix .":
      return ["npx", "eslint", "--fix", "."];
    case "npx eslint --fix --ext .ts,.tsx,.js,.jsx .":
      return ["npx", "eslint", "--fix", "--ext", ".ts,.tsx,.js,.jsx", "."];
    case "npx prettier --write .":
      return ["npx", "prettier", "--write", "."];
    case "npx yaml-lint --fix .":
      return ["npx", "yaml-lint", "--fix", "."];
    case "npx markdownlint --fix .":
      return ["npx", "markdownlint", "--fix", "."];
    default: {
      if (trimmed.startsWith("git commit -m ")) {
        const rawMessage = trimmed.replace(/^git commit -m\s+/, "");
        const message = stripWrappingQuotes(rawMessage);
        if (UNSAFE_PATTERN.test(message)) {
          throw new Error("Unsafe commit message content");
        }
        return ["git", "commit", "-m", message];
      }
      break;
    }
  }

  throw new Error(`Command not allowed: ${segment}`);
}

export function parseCommandSegments(command: string): string[][] {
  const segments = command
    .split("&&")
    .map(s => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error("No command to execute");
  }

  return segments.map(parseSegment);
}

export { UNSAFE_PATTERN };
