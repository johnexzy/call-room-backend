import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get('GEMINI_API_KEY'),
    );
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  async analyzeSentiment(text: string) {
    const schema = {
      type: 'object',
      properties: {
        sentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral'],
        },
        score: {
          type: 'number',
          description: 'Sentiment score between 0 and 1',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score between 0 and 1',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['sentiment', 'score', 'confidence', 'keywords'],
    };

    const prompt = `Analyze the sentiment of the following text. Consider tone, word choice, and context:
    
    "${text}"
    
    Provide a detailed sentiment analysis with a score (0-1), confidence level, and key emotional words/phrases identified.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      throw error;
    }
  }

  async generateCallSummary(transcript: string) {
    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
        },
        actionItems: {
          type: 'array',
          items: { type: 'string' },
        },
        customerSentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral'],
        },
      },
      required: ['summary', 'keyPoints', 'actionItems', 'customerSentiment'],
    };

    const prompt = `Analyze this customer service call transcript and provide a structured summary:
    
    "${transcript}"
    
    Include a brief summary, key points discussed, action items, and overall customer sentiment.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Call summary generation failed:', error);
      throw error;
    }
  }

  async suggestNextSteps(context: string) {
    const schema = {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              reasoning: { type: 'string' },
            },
          },
        },
      },
      required: ['suggestions'],
    };

    const prompt = `Based on this customer interaction context, suggest next steps:
    
    "${context}"
    
    Provide actionable suggestions with priority levels and reasoning.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 3,
          topP: 0.8,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Next steps suggestion failed:', error);
      throw error;
    }
  }
}
