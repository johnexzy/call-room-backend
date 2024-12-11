import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';
import { ISentence, ITranscript } from '@/types/index';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  private client: SpeechClient;

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
}
