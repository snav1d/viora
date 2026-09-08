/**
 * SMS abstraction (docs/decisions.md ADR 3). Every call site sends through this interface so
 * swapping in a real Iranian SMS gateway later is a new provider file + one line in the
 * factory below, never a call-site change.
 */
export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    console.log(`[sms:console] to=${phone} message="${message}"`);
  }
}

let cached: SmsProvider | undefined;

export function getSmsProvider(): SmsProvider {
  if (cached) return cached;

  switch (process.env.SMS_PROVIDER ?? "console") {
    case "console":
      cached = new ConsoleSmsProvider();
      break;
    default:
      throw new Error(
        `Unknown SMS_PROVIDER "${process.env.SMS_PROVIDER}". Only "console" is implemented in Sprint 0.`,
      );
  }
  return cached;
}
