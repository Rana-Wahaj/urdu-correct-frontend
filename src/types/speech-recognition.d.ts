type SpeechRecognition = any; // Define as `any` for compatibility
type SpeechGrammarList = any; // Optional: Define if needed

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}
