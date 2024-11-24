import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT_ID'),
      credentials: {
        client_email: this.configService.get('GOOGLE_CLOUD_CLIENT_EMAIL'),
        private_key: this.configService
          .get('GOOGLE_CLOUD_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      },
    });
    this.bucket = this.configService.get('GOOGLE_CLOUD_BUCKET_NAME');
  }

  async saveRecording(callId: string, blob: Blob): Promise<void> {
    const buffer = await blob.arrayBuffer();
    const file = this.storage
      .bucket(this.bucket)
      .file(`recordings/${callId}.webm`);

    await file.save(Buffer.from(buffer), {
      metadata: {
        contentType: 'audio/webm',
      },
    });
  }

  async getRecording(callId: string): Promise<Buffer> {
    const file = this.storage
      .bucket(this.bucket)
      .file(`recordings/${callId}.webm`);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error('Recording not found');
    }

    const [buffer] = await file.download();
    return buffer;
  }

  async getSignedUrl(callId: string): Promise<string> {
    const file = this.storage
      .bucket(this.bucket)
      .file(`recordings/${callId}.webm`);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error('Recording not found');
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return url;
  }

  async getLongLivedUrl(callId: string): Promise<string> {
    const file = this.storage
      .bucket(this.bucket)
      .file(`recordings/${callId}.webm`);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error('Recording not found');
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return url;
  }
}
