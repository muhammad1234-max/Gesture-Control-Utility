import crypto from 'crypto';
import fs from 'fs';
import { Logger } from '../system/Logger';

export class UpdateValidator {
  /**
   * Verifies the SHA256 checksum of a downloaded file against the expected hash.
   */
  public static verifyChecksum(filePath: string, expectedSha256: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!fs.existsSync(filePath)) {
        Logger.error(`Checksum validation failed: File not found at ${filePath}`);
        return resolve(false);
      }

      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        const isValid = fileHash.toLowerCase() === expectedSha256.toLowerCase();
        
        if (!isValid) {
          Logger.error(`Checksum mismatch! Expected: ${expectedSha256}, Got: ${fileHash}`);
        } else {
          Logger.info('Checksum validation passed.');
        }
        
        resolve(isValid);
      });
      stream.on('error', (err) => {
        Logger.error('Failed to read file during checksum validation', { error: err.message });
        resolve(false);
      });
    });
  }
}
