/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { randomString } from 'src/utils';
@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  async createRecorder(inputStream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const command = ffmpeg()
        .input(inputStream)
        .inputFormat('webm')
        .audioCodec('copy')
        .toFormat('webm')
        .on('start', (commandLine) => {
          console.log('FFmpeg started:', commandLine);
        })
        .on('error', (err: Error) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('FFmpeg processing finished');
          resolve(Buffer.concat(chunks));
        });

      const stream = command.pipe();

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('error', (err: Error) => {
        console.error('Stream error:', err);
        reject(err);
      });
    });
  }

  async processAudioData(audioData: Buffer): Promise<Buffer> {
    const inputStream = Readable.from(audioData);
    return this.createRecorder(inputStream);
  }

  async acquireResource(
    callId: string,
    userId: number,
    token: string,
    appToken: string,
  ) {
    try {
      this.logger.log('Acquiring resource', { callId, userId });
      const response = await axios.post(
        `${process.env.AGORA_BASE_URL}/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/acquire`,
        {
          cname: callId,
          uid: userId.toString(),
          clientRequest: {
            // token: appToken,
          },
        },
        {
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.resourceId;
    } catch (error) {
      console.error('Error acquiring resource:', error);
      throw error;
    }
  }

  async startRecording(
    resourceId: string,
    callId: string,
    userId: number,
    token: string,
    appToken: string,
  ) {
    try {
      this.logger.log(
        'Starting recording',
        `recordings-${Math.floor(Date.now() / 1000)}`,
      );
      const response = await axios.post(
        `${process.env.AGORA_BASE_URL}/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
        {
          cname: callId,
          uid: userId.toString(),
          clientRequest: {
            token: appToken,
            recordingConfig: {
              maxIdleTime: 30,
              streamTypes: 0,
              channelType: 1, // Set to 0 for communication mode
            },
            recordingFileConfig: {
              avFileType: ['hls', 'mp4'],
            },
            storageConfig: {
              vendor: 1,
              region: 0,
              bucket: process.env.AWS_BUCKET_NAME,
              accessKey: process.env.AWS_ACCESS_KEY_ID,
              secretKey: process.env.AWS_SECRET_ACCESS_KEY,
              fileNamePrefix: [randomString(10)],
            },
          },
        },
        {
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.sid;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(
    resourceId: string,
    sid: string,
    callId: string,
    userId: number,
    token: string,
    appToken: string,
  ) {
    try {
      const response = await axios.post(
        `${process.env.AGORA_BASE_URL}/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
        {
          cname: callId,
          uid: userId.toString(),
          clientRequest: {
            // token: appToken,
            // async_stop: false,
          },
        },
        {
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { ...response.data, sid, callId };
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }
}
