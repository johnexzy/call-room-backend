import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import AWS from 'aws-sdk';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;
  private s3: AWS.S3;

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

    // Initialize AWS S3 client using ConfigService
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
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

  async transferFileFromAWSToGCP(
    s3Bucket: string,
    s3Key: string,
    gcpDestination: string,
  ): Promise<void> {
    try {
      // Download file from AWS S3
      const s3Object = await this.s3
        .getObject({ Bucket: s3Bucket, Key: s3Key })
        .promise();
      const fileBuffer = s3Object.Body as Buffer;

      // Upload file to GCP Storage
      const file = this.storage.bucket(this.bucket).file(gcpDestination);
      await file.save(fileBuffer);

      console.log(
        `File successfully transferred from AWS S3 to GCP Storage: ${gcpDestination}`,
      );
    } catch (error) {
      console.error('Error transferring file:', error);
      throw new Error('File transfer failed');
    }
  }
}
