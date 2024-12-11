export interface ITranscript {
  transcript: string;
  words: {
    word: string;
    start: string;
    end: string;
  }[];
  sentences?: ISentence[];
}
export interface ISentence {
  sentence: string;
  start: string;
  end: string;
}
