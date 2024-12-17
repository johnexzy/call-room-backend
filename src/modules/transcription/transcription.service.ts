import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';
import { ISentence, ITranscript } from '@/types/index';
import { Subject } from 'rxjs';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  private client: SpeechClient;
  private streamingRecognizeSubjects: Map<string, Subject<string>> = new Map();
  private streamingClients: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.client = new SpeechClient({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT_ID'),
      credentials: {
        client_email: this.configService.get('GOOGLE_CLOUD_CLIENT_EMAIL'),
        private_key: this.configService
          .get('GOOGLE_CLOUD_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      },
    });
  }

  async transcribeAudioFile(gcsUri: string, sampleRate: number) {
    const { AudioEncoding } = protos.google.cloud.speech.v1.RecognitionConfig;
    const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
      audio: {
        uri: gcsUri,
      },
      config: {
        encoding: AudioEncoding.LINEAR16,
        sampleRateHertz: sampleRate,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        maxAlternatives: 2,
        enableWordTimeOffsets: true,
        model: 'video',
        useEnhanced: true,
      },
    };

    try {
      this.logger.log('Starting audio transcription');

      const [operation] = await this.client.longRunningRecognize(request);
      const [response] = await operation.promise();

      const transcriptionData = [];

      response?.results?.forEach((result) => {
        const transcription = {
          transcript: result.alternatives[0].transcript,
          words: result?.alternatives[0]?.words?.map((wordInfo) => ({
            word: wordInfo?.word,
            start: `${wordInfo?.startTime?.seconds}.${Math.floor(
              wordInfo?.startTime?.nanos / 100000000,
            )}`,
            end: `${wordInfo?.endTime?.seconds}.${Math.floor(
              wordInfo?.endTime?.nanos / 100000000,
            )}`,
          })),
        };
        if (transcription.words.length > 0) {
          this.addSentencesToTranscript(transcription, 10);
          transcriptionData.push(transcription);
        }
      });

      return transcriptionData;
    } catch (error) {
      console.error('Error in audio transcription:', error);
      throw new Error('Error in audio transcription');
    }
  }

  private addSentencesToTranscript(
    transcriptObj: ITranscript,
    maxWordsPerSentence: number,
  ): void {
    const sentences: ISentence[] = [];
    let sentenceWords: string[] = [];
    let sentenceStart = '';
    let sentenceEnd = '';

    const endSentence = () => {
      if (sentenceWords.length > 0) {
        const sentence: ISentence = {
          sentence: sentenceWords.join(' '),
          start: sentenceStart,
          end: sentenceEnd,
        };
        sentences.push(sentence);
        sentenceWords = [];
      }
    };

    transcriptObj.words.forEach((wordObj, index) => {
      if (sentenceWords.length === 0) {
        sentenceStart = wordObj.start;
      }
      sentenceWords.push(wordObj.word);
      sentenceEnd = wordObj.end;

      // Check for natural sentence endings or max word count
      if (
        /[.!?]$/.test(wordObj.word) ||
        sentenceWords.length >= maxWordsPerSentence ||
        index === transcriptObj.words.length - 1
      ) {
        endSentence();
      }
    });

    transcriptObj.sentences = sentences;
  }

  private cleanupSession(sessionId: string): void {
    const recognizeStream = this.streamingClients.get(sessionId);
    const subject = this.streamingRecognizeSubjects.get(sessionId);

    if (recognizeStream) {
      recognizeStream.end();
      this.streamingClients.delete(sessionId);
    }

    if (subject) {
      subject.complete();
      this.streamingRecognizeSubjects.delete(sessionId);
    }
  }

  async startStreamingRecognition(sessionId: string): Promise<Subject<string>> {
    // Cleanup any existing session
    this.cleanupSession(sessionId);

    const subject = new Subject<string>();
    this.streamingRecognizeSubjects.set(sessionId, subject);

    const request = {
      config: {
        encoding:
          protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
            .LINEAR16,
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'default',
        useEnhanced: true,
        enableWordTimeOffsets: true,
        maxAlternatives: 1,
        profanityFilter: true,
        speechContexts: [
          {
            phrases: ['hello', 'hi', 'hey'],
            boost: 20,
          },
        ],
      },
      interimResults: false,
      singleUtterance: false,
    };

    try {
      const recognizeStream = this.client
        .streamingRecognize(request)
        .on('error', (error) => {
          this.logger.error(`Error in streaming recognition: ${error.message}`);
          subject.error(error);
        })
        .on('data', (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            const transcript = data.results[0].alternatives[0].transcript;
            if (transcript.trim()) {
              subject.next(transcript);
            }
          }
        })
        .on('end', () => {
          subject.complete();
          this.cleanupSession(sessionId);
        });

      this.streamingClients.set(sessionId, recognizeStream);
      return subject;
    } catch (error) {
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  async processAudioChunk(sessionId: string, audioData: string): Promise<void> {
    const recognizeStream = this.streamingClients.get(sessionId);
    if (!recognizeStream) {
      throw new Error('No active streaming session found');
    }

    try {
      const audioBuffer = Buffer.from(audioData, 'base64');
      recognizeStream.write(audioBuffer);
    } catch (error) {
      this.logger.error(`Error processing audio chunk: ${error.message}`);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  async stopStreamingRecognition(sessionId: string): Promise<void> {
    this.cleanupSession(sessionId);
  }
}
