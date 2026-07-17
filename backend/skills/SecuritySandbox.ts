export class SecuritySandbox {
  private static readonly RESTRICTED_KEYWORDS = [
    'rm -rf',
    'format c:',
    'del /s',
    'reg delete',
    'DropTable'
  ];

  public static sanitizePrompt(prompt: string): string {
    // Strip malicious injections
    return prompt.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  public static isSafeInstruction(instruction: string): boolean {
    const lower = instruction.toLowerCase();
    for (const keyword of this.RESTRICTED_KEYWORDS) {
      if (lower.includes(keyword)) {
        return false;
      }
    }
    return true;
  }

  public static detectEscalation(requestedPermissions: string[], grantedPermissions: string[]): boolean {
    // Return true if escalation detected
    for (const req of requestedPermissions) {
      if (!grantedPermissions.includes(req)) {
        return true;
      }
    }
    return false;
  }
}
