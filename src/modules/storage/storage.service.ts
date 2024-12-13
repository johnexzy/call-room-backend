import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from '../transcription/transcription.service';
import AWS from 'aws-sdk';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
export enum FileType {
  RECORDING = 'recordings',
  TRANSCRIPTION = 'transcriptions',
}

export interface TranscriptionResult {
  meta: Array<{
    transcript?: string;
    words?: Array<{
      word?: string;
      start?: string;
      end?: string;
    }>;
  }>;
  transcript: string;
  wavUrl: string;
}

export interface UploadOptions {
  destination: string;
  resumable: boolean;
  validation: string;
  metadata: {
    contentType: string;
  };
}

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
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      credentials: {
        client_email: this.configService.get<string>(
          'GOOGLE_CLOUD_CLIENT_EMAIL',
        ),
        private_key: this.configService
          .get<string>('GOOGLE_CLOUD_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      },
    });
    this.bucket = this.configService.get<string>('GOOGLE_CLOUD_BUCKET_NAME');

    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  private getFilePath(fileType: FileType, identifier: string): string {
    return `${fileType}/${identifier}.wav`;
  }

  private async generateSignedUrl(
    filePath: string,
    expirationHours = 24,
  ): Promise<string> {
    const file = this.storage.bucket(this.bucket).file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expirationHours * 60 * 60 * 1000,
    });

    return url;
  }

  async getRecordingUrl(
    identifier: string,
    longLived = false,
  ): Promise<string> {
    const filePath = this.getFilePath(FileType.RECORDING, identifier);
    return this.generateSignedUrl(filePath, longLived ? 168 : 24); // 168 hours = 7 days
  }

  async refreshWavUrl(timestamp: string): Promise<string> {
    const filePath = this.getFilePath(FileType.TRANSCRIPTION, timestamp);
    return this.generateSignedUrl(filePath, 168); // Always 7 days for transcriptions
  }

  async transcribeAudioFile(
    gcsUri: string,
    sampleRate: number,
  ): Promise<
    Array<{
      transcript?: string;
      words?: Array<{
        word?: string;
        start?: string;
        end?: string;
      }>;
    }>
  > {
    return this.transcriptionService.transcribeAudioFile(gcsUri, sampleRate);
  }

  async processAudioContent(
    file: Buffer | string,
    isMP4 = false,
  ): Promise<TranscriptionResult> {
    try {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'call-room-'));
      const timestamp = Date.now().toString();
      const inputPath = path.join(
        tempDir,
        `input_${timestamp}${isMP4 ? '.mp4' : ''}`,
      );
      const audioFilePath = path.join(tempDir, `audio_${timestamp}.wav`);
      const gcsFileName = this.getFilePath(FileType.RECORDING, timestamp);

      // Write input file
      if (typeof file === 'string') {
        fs.writeFileSync(inputPath, fs.readFileSync(file));
      } else {
        fs.writeFileSync(inputPath, file);
      }

      // Convert to WAV format
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(inputPath);

        command
          .toFormat('wav')
          .outputOptions([
            '-vn', // Disable video
            '-ac 1', // Mono audio
            '-ar 16000', // 16kHz sample rate
            '-acodec pcm_s16le', // 16-bit PCM encoding
          ])
          .output(audioFilePath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file conversion failed');
      }

      this.logger.log('Generated WAV file');
      const gcsUri = await this.uploadAudioToGCS(audioFilePath, gcsFileName);
      const sampleRate = await this.getAudioSampleRate(audioFilePath);
      const wavUrl = await this.generateSignedUrl(gcsFileName, 168); // 7 days

      const transcriptResponse = await this.transcribeAudioFile(
        gcsUri,
        sampleRate,
      );
      const transcript = transcriptResponse
        .map((result) => result?.transcript)
        .join('\n');

      // Clean up temporary files
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        this.logger.error('Error during file cleanup:', cleanupError);
      }

      return {
        meta: transcriptResponse,
        transcript,
        wavUrl,
      };
    } catch (error) {
      this.logger.error('Error processing audio:', error);
      throw error;
    }
  }

  async uploadAudioToGCS(
    audioFilePath: string,
    gcsFileName: string,
  ): Promise<string> {
    const options: UploadOptions = {
      destination: gcsFileName,
      resumable: true,
      validation: 'crc32c',
      metadata: {
        contentType: 'audio/wav',
      },
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
        if (error) return reject(error);
        const sampleRate = metadata?.streams[0]?.sample_rate;
        resolve(parseInt(sampleRate as unknown as string, 10));
      });
    });
  }

  async transferFileFromAWSToGCP(
    s3Bucket: string,
    s3Key: string,
    gcpDestination: string,
  ): Promise<TranscriptionResult> {
    try {
      const s3Object = await this.s3
        .getObject({ Bucket: s3Bucket, Key: s3Key })
        .promise();
      const fileBuffer = Buffer.isBuffer(s3Object.Body)
        ? s3Object.Body
        : Buffer.from(s3Object.Body as string);

      const result = await this.processAudioContent(fileBuffer, true); // Set isMP4 to true for Agora recordings

      this.logger.log(
        `File successfully transferred from AWS S3 to GCP Storage: ${gcpDestination}`,
      );
      this.logger.log(`Transcript: ${result.transcript}`);
      this.logger.log(`WAV URL: ${result.wavUrl}`);
      return result;
    } catch (error) {
      this.logger.error('Error transferring file:', error);
      throw new Error('File transfer failed');
    }
  }
}
