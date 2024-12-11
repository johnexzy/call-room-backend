import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from '../transcription/transcription.service';
import AWS from 'aws-sdk';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;
  private s3: AWS.S3;
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private configService: ConfigService,
    private transcriptionService: TranscriptionService,
  ) {
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

  async transcribeAudioFile(gcsUri: string, sampleRate: number) {
    return this.transcriptionService.transcribeAudioFile(gcsUri, sampleRate);
  }

  async transcribeVideoContent(_file: Buffer | string) {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const timestamp = Date.now();
      const audioFilePath = path.join(tempDir, `audio_${timestamp}.wav`);
      const gcsFileName = `transcriptions/${timestamp}.wav`;

      // Convert video to audio
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg();

        if (typeof _file === 'string') {
          command.input(_file);
        } else {
          // Create a readable stream from the buffer
          const readableStream = new Readable();
          readableStream.push(_file);
          readableStream.push(null);
          command.input(readableStream);
        }

        command
          .outputOptions('-vn')
          .outputOptions('-ac 1')
          .output(audioFilePath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file not found');
      }

      this.logger.log('Generated audio file');
      const gcsUri = await this.uploadAudioToGCS(audioFilePath, gcsFileName);
      const sampleRate = await this.getAudioSampleRate(audioFilePath);

      // Get a signed URL for the WAV file
      const file = this.storage.bucket(this.bucket).file(gcsFileName);
      const [wavUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (maximum allowed)
      });

      // Use the transcribeAudioFile method from TranscriptionService
      const transcriptResponse = await this.transcribeAudioFile(
        gcsUri,
        sampleRate,
      );

      const transcript = transcriptResponse
        .map((result) => result?.transcript)
        .join('\n');

      // Clean up temporary files
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        this.logger.error('Error during file cleanup:', cleanupError);
      }

      return {
        meta: transcriptResponse,
        transcript,
        wavUrl,
      };
    } catch (error) {
      this.logger.error('Error processing transcription:', error);
      throw error;
    }
  }

  async uploadAudioToGCS(
    audioFilePath: string,
    gcsFileName: string,
  ): Promise<string> {
    const options = {
      destination: gcsFileName,
      resumable: true, // Enable resumable uploads
      validation: 'crc32c', // Use CRC32C for data integrity
    };

    try {
      await this.storage.bucket(this.bucket).upload(audioFilePath, options);

      this.logger.log(
        `Audio file uploaded to GCS: gs://${this.bucket}/${gcsFileName}`,
      );
      return `gs://${this.bucket}/${gcsFileName}`;
    } catch (error) {
      this.logger.error('Failed to upload audio file to GCS:', error);
      throw error;
    }
  }
  private getAudioSampleRate(audioFilePath: string): Promise<number> {
    this.logger.log('Getting audio sample rate');
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioFilePath, (error, metadata) => {
        if (error) {
          return reject(error);
        }
        const sampleRate = metadata?.streams[0]?.sample_rate;
        resolve(parseInt(sampleRate as unknown as string, 10));
      });
    });
  }

  async transferFileFromAWSToGCP(
    s3Bucket: string,
    s3Key: string,
    gcpDestination: string,
  ) {
    try {
      // Download file from AWS S3
      const s3Object = await this.s3
        .getObject({ Bucket: s3Bucket, Key: s3Key })
        .promise();

      // Convert Body to Buffer if it isn't already
      const fileBuffer = Buffer.isBuffer(s3Object.Body)
        ? s3Object.Body
        : Buffer.from(s3Object.Body as string);

      const transcript = await this.transcribeVideoContent(fileBuffer);

      this.logger.log(
        `File successfully transferred from AWS S3 to GCP Storage: ${gcpDestination}`,
      );
      this.logger.log(`Transcript: ${transcript.transcript}`);
      this.logger.log(`WAV URL: ${transcript.wavUrl}`);
      return transcript;
    } catch (error) {
      this.logger.error('Error transferring file:', error);
      throw new Error('File transfer failed');
    }
  }

  async refreshWavUrl(timestamp: string): Promise<string> {
    const gcsFileName = `transcriptions/${timestamp}.wav`;
    const file = this.storage.bucket(this.bucket).file(gcsFileName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error('WAV file not found');
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return url;
  }
}
