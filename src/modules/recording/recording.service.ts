import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

@Injectable()
export class RecordingService {
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
    try {
      console.log('Processing audio data of size:', audioData.length);
      const inputStream = Readable.from(audioData);
      return await this.createRecorder(inputStream);
    } catch (error) {
      console.error('Error in processAudioData:', error);
      throw error;
    }
  }
}
