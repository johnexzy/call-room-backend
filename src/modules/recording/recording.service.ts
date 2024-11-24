import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

@Injectable()
export class RecordingService {
  async createRecorder(inputStream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = ffmpeg()
        .input(inputStream)
        .inputFormat('s16le')
        .audioChannels(1)
        .audioFrequency(44100)
        .toFormat('webm')
        .pipe();

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  async processAudioData(audioData: Buffer): Promise<Buffer> {
    const inputStream = Readable.from(audioData);
    return this.createRecorder(inputStream);
  }
}
