import { unix } from "../../utils";
import hmac from "../hmac";
import { parseHeaders } from "./parsers";

/**
 * Protect against replay attacks by enforcing X
 * @param timestamp Unix timestamp
 * @returns 
 */
const validateTimestamp = (timestamp: string) => {
  const millisecondDifference = Date.now() - unix.toDate(timestamp);
  if (millisecondDifference < 0) throw new Error()

  const something = 1 * 60 * 1000
  if (millisecondDifference > something) throw new Error()
}

/**
 * Responsible for parsing and verifying requests
 * @todo should this also handle serializing responses?
 * @todo middleware?
 */

export default {
  /**
   * Validate signature using hmac
   * @see https://api.slack.com/authentication/verifying-requests-from-slack
   * @todo parse body?
   */
  verifyRequest: (request: Request) => {
    console.info('Verifying request')

    // utf-8 encode secret?
    const { signature, timestamp } = parseHeaders(request.headers);
    // utf-8 encode body? TextEncoder("utf-8").encode
    const signatureData = `v0:${timestamp}:${JSON.stringify(request.body)}`;

    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    if (!clientSecret) throw new Error('SLACK_CLIENT_SECRET is required')
    const expectedSignature = hmac.createDigest(clientSecret, signatureData);

    // throw or parse return?

    validateTimestamp(timestamp)
    

    return {
      isValid: hmac.safeCompareDigests(expectedSignature, signature),
      headers: { signature, timestamp },
      body: request.body,
    }
  }
}
