
import { Component, inject, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelService } from '../../Services/ModelService/model.service';

interface Message {
  text: string;
  isUser: boolean;
  isInfo?: boolean;
  isTyping?: boolean;
  displayText?: string;
  model?: string; // Add model used
  mode?: string;  // Add mode (sentence/paragraph)
  responseTime?: string; // Add response time
}

interface ParsedBotMessage {
  input: string;
  corrected: string;
  errors: any[];
  closing: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatComponent {
  messages: Message[] = [];
  userInput: string = '';
  userInputCopy: string = '';
  isListening: boolean = false;
  isBrowser: boolean;
  isLoading: boolean = false;
  showInfoPopup: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private recognition: SpeechRecognition | null = null;

  // Mode and model selection
  mode: 'sentence' | 'paragraph' = 'sentence';
  selectedModel: 'mt5_large' | 'mBart' = 'mt5_large';
  availableModels: { value: 'mt5_large' | 'mBart'; label: string }[] = [
    { value: 'mt5_large', label: 'mT5 Large' },
    { value: 'mBart', label: 'mBART' }
  ];

  private readonly infoText = `دُرستگو کا تعارف:
دُرستگو ایک ایپلیکیشن ہے جو اُردو گرامر کی غلطیوں کو درست کرنے کے لیے مشین لرننگ اور NLP کا استعمال کرتی ہے، تاکہ تحریر زیادہ درست اور فصیح ہو۔

استعمالات:
تعلیمی مواد:
طلباء اور اساتذہ تحریری کام کو گرامر کی غلطیوں سے پاک کرنے کے لیے استعمال کر سکتے ہیں۔
زبان سیکھنے والے:
اُردو سیکھنے والے افراد اپنی مہارت کو بہتر بنا سکتے ہیں۔
ویب مواد:
بلاگرز اور ویب مواد تخلیق کرنے والے اپنی تحریر کو درست کر سکتے ہیں۔
دُرستگو اُردو کی گرامر کو درست کرنے کے ساتھ ساتھ تحریر کو پیشہ ورانہ اور موثر بناتا ہے۔`;

  modelService = inject(ModelService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.loadVoices().then(() => {
        console.log('Available voices:', this.voices);
      });
    }
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!this.isBrowser) {
        resolve();
        return;
      }

      const voices = synth.getVoices();
      if (voices.length > 0) {
        this.voices = voices;
        resolve();
        return;
      }

      synth.onvoiceschanged = () => {
        this.voices = synth.getVoices();
        synth.onvoiceschanged = null;
        resolve();
      };
    });
  }

  toggleInfoPopup() {
    this.showInfoPopup = !this.showInfoPopup;
  }

  handlePopupClick(event: MouseEvent) {
    this.toggleInfoPopup();
  }

  speakInfo() {
    this.speakMessage({ text: this.infoText, isUser: false, isInfo: true });
  }

  toggleMode(newMode: 'sentence' | 'paragraph') {
    this.mode = newMode;
  }

  async sendMessage() {
    if (this.userInput.trim()) {
      // Stop speech recognition if active
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
        this.isListening = false;
      }

      this.messages.push({ text: this.userInput, isUser: true });
      this.userInputCopy = this.userInput;
      const normalizedUserInput = this.normalizeSentence(this.userInput);
      
      this.userInput = '';
      this.isLoading = true;

      try {
        // Determine the endpoint and model label
        let endpoint: string;
        let modelLabel: string;
        if (this.mode === 'sentence') {
          endpoint = 'mt5_sentence';
          modelLabel = 'mT5 Sentence'; // Specific label for sentence mode
        } else {
          endpoint = this.selectedModel === 'mt5_large' ? 'mt5_paragraph' : 'bart_paragraph';
          modelLabel = this.selectedModel === 'mt5_large' ? 'mT5 Large' : 'mBART';
        }

        // Capitalize mode for display
        const modeLabel = this.mode === 'sentence' ? 'Sentence' : 'Paragraph';

        // Measure response time
        const startTime = performance.now();

        const response = await this.modelService.correctText(this.userInputCopy, endpoint).toPromise();
        const normalizedCorrectedText = this.normalizeSentence(response.corrected_text);

        const endTime = performance.now();
        const responseTime = ((endTime - startTime) / 1000).toFixed(2); // Convert to seconds

        let botReply = `آپ نے یہ ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} درج کیا: ${this.userInputCopy}\n\n`;
        if (normalizedUserInput === normalizedCorrectedText && (!response.errors || response.errors.length === 0)) {
          botReply += `بہت خوب! آپ کا ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} بالکل درست ہے، کوئی اصلاح کی ضرورت نہیں۔ اگر آپ کو مزید مدد کی ضرورت ہو، میں ہمیشہ یہاں ہوں۔ ✨`;
        } else {
          botReply += `میں نے آپ کے دیے گئے ${this.mode === 'sentence' ? 'جملے' : 'پیراگراف'} میں غلطیاں پائی ہیں اور انہیں درست کیا ہے۔ یہ ہے آپ کا درست شدہ ورژن:\n${response.corrected_text}\n\n`;
          
          if (response.errors && response.errors.length > 0) {
            response.errors.forEach((error: any, index: number) => {
              botReply += `${index + 1}. آپ نے "${error.incorrect}" استعمال کیا جبکہ یہ "${error.correct}" ہونا چاہیے کیونکہ ${error.reason}\n`;
            });
          } else {
            botReply += `کوئی مخصوص گرامر کی غلطی نہیں ملی، لیکن ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} بہتر بنایا گیا ہے۔\n`;
          }
          
          botReply += `\nبہت خوب! اگر آپ کو مزید مدد کی ضرورت ہو، تو میں یہاں ہوں! ✨`;
        }

        // Add bot reply with metadata
        this.messages.push({ 
          text: botReply, 
          isUser: false, 
          isTyping: true,
          model: modelLabel,
          mode: modeLabel,
          responseTime: `${responseTime} seconds`
        });
        await this.typeMessage(botReply);
      } catch (error) {
        console.error('Error correcting text:', error);
        this.messages.push({ 
          text: 'متن درست کرنے میں خرابی ہوئی ہے۔ براہ کرم کچھ وقت بعد دوبارہ کوشش کریں۔', 
          isUser: false,
          model: this.mode === 'sentence' ? 'mT5 Sentence' : (this.selectedModel === 'mt5_large' ? 'mT5 Large' : 'mBART'),
          mode: this.mode === 'sentence' ? 'Sentence' : 'Paragraph',
          responseTime: 'N/A'
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  private async typeMessage(message: string): Promise<void> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && !lastMessage.isUser) {
      lastMessage.isTyping = true;
      lastMessage.displayText = '';
      
      for (let i = 0; i < message.length; i++) {
        if (lastMessage.displayText) {
          lastMessage.displayText += message[i];
        } else {
          lastMessage.displayText = message[i];
        }
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      lastMessage.isTyping = false;
    }
  }

  normalizeSentence(sentence: string): string {
    return sentence
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[۔،]/g, '');
  }

  parseBotMessage(message: string): ParsedBotMessage {
    const lines = message.split('\n');
    let input = '';
    let corrected = '';
    let errors: any[] = [];
    let closing = '';
    let currentSection = '';

    lines.forEach(line => {
      if (line.startsWith('آپ نے یہ')) {
        input = line.replace(/آپ نے یہ (جملہ|پیراگراف) درج کیا: /, '').trim();
        currentSection = 'input';
      } else if (line.includes('درست شدہ ورژن:')) {
        corrected = line.replace(/.*درست شدہ ورژن:\s*/, '').trim();
        currentSection = 'corrected';
      } else if (line.match(/^\d+\.\s*آپ نے/)) {
        const match = line.match(/(\d+)\.\s*آپ نے\s*"([^"]+)"\s*استعمال کیا جبکہ یہ\s*"([^"]+)"\s*ہونا چاہیے کیونکہ\s*(.*)/);
        if (match) {
          const error = {
            incorrect: match[2],
            correct: match[3],
            error_type: '',
            description: `غلط لفظ "${match[2]}" استعمال ہوا، صحیح لفظ "${match[3]}" ہونا چاہیے۔`,
            reason: match[4]
          };
          errors.push(error);
        }
        currentSection = 'errors';
      } else if (line.includes('بہت خوب!') || line.includes('ہمیشہ یہاں ہوں')) {
        closing += line + '\n';
        currentSection = 'closing';
      } else if (currentSection === 'corrected' && line.trim()) {
        corrected += '\n' + line.trim();
      }
    });

    const uniqueErrors: any[] = [];
    const seenErrors = new Set<string>();
    errors.forEach(error => {
      const errorKey = `${error.incorrect}|${error.correct}`;
      if (!seenErrors.has(errorKey)) {
        seenErrors.add(errorKey);
        const reason = error.reason.toLowerCase();
        let error_type = 'نامعلوم';
        if (reason.includes('اسم')) error_type = 'اسم کی غلطی';
        else if (reason.includes('فعل')) error_type = 'فعل کی غلطی';
        else if (reason.includes('ضمیر')) error_type = 'ضمیر کی غلطی';
        else if (reason.includes('حرف')) error_type = 'حرف ربط یا حرف جار کی غلطی';
        uniqueErrors.push({ ...error, error_type });
      }
    });

    return { input, corrected, errors: uniqueErrors, closing: closing.trim() };
  }

  startSpeechToText() {
    if (!this.isBrowser) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('اس براؤزر میں صوتی شناخت کی حمایت نہیں ہے۔');
      return;
    }

    // Toggle speech recognition
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      this.isListening = false;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ur-PK';
    this.recognition.interimResults = false;
    this.recognition.continuous = false;

    this.isListening = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      this.userInput = transcript;
      this.isListening = false;
      this.recognition = null;
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.recognition = null;
      alert('صوتی شناخت میں خرابی: ' + event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.recognition = null;
    };

    this.recognition.start();
  }

  async speakMessage(message: Message) {
    if (!this.isBrowser || !message.text.trim()) {
      console.warn('Cannot speak: Not in browser or empty text');
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    if (!this.voices.length) {
      await this.loadVoices();
    }

    let speechText = message.text;
    // For info text, speak directly
    if (message.isInfo) {
      speechText = message.text;
    }
    // For bot messages, reconstruct text using filtered errors
    else if (!message.isUser) {
      const parsed = this.parseBotMessage(message.text);
      speechText = `آپ نے یہ ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} درج کیا: ${parsed.input}\n\n`;
      if (parsed.errors.length === 0 && parsed.corrected === parsed.input) {
        speechText += `بہت خوب! آپ کا ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} بالکل درست ہے، کوئی اصلاح کی ضرورت نہیں۔ اگر آپ کو مزید مدد کی ضرورت ہو، میں ہمیشہ یہاں ہوں۔`;
      } else {
        speechText += `میں نے آپ کے دیے گئے ${this.mode === 'sentence' ? 'جملے' : 'پیراگراف'} میں غلطیاں پائی ہیں اور انہیں درست کیا ہے۔ یہ ہے آپ کا درست شدہ ورژن:\n${parsed.corrected}\n\n`;
        if (parsed.errors.length > 0) {
          parsed.errors.forEach((error, index) => {
            speechText += `${index + 1}. آپ نے "${error.incorrect}" استعمال کیا جبکہ یہ "${error.correct}" ہونا چاہیے کیونکہ ${error.reason}\n`;
          });
        } else {
          speechText += `کوئی مخصوص گرامر کی غلطی نہیں ملی، لیکن ${this.mode === 'sentence' ? 'جملہ' : 'پیراگراف'} بہتر بنایا گیا ہے۔\n`;
        }
        speechText += `\n${parsed.closing}`;
      }
      // Add model, mode, and response time to spoken text
      speechText += `\n\nیہ جواب ${message.model} ماڈل نے ${message.mode} موڈ میں تیار کیا۔ جواب دینے میں ${message.responseTime} لگے۔`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    const urduVoice = this.voices.find(voice => voice.lang === 'ur-PK');
    const fallbackVoice = this.voices[0];

    if (urduVoice) {
      utterance.voice = urduVoice;
      utterance.lang = 'ur-PK';
    } else if (fallbackVoice) {
      utterance.voice = fallbackVoice;
      utterance.lang = fallbackVoice.lang;
      console.warn('No Urdu voice found, using fallback voice:', fallbackVoice.name);
      alert('اردو صوتی حمایت نہیں ملی، متبادل صوت استعمال کی جا رہی ہے۔');
    } else {
      console.error('No voices available for speech synthesis');
      alert('کوئی صوتی حمایت نہیں ملی۔ براہ کرم براؤزر سیٹنگز چیک کریں۔');
      return;
    }

    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      alert('صوتی ترکیب میں خرابی: ' + event.error);
    };

    utterance.onstart = () => {
      console.log('Speech started:', speechText);
    };
    utterance.onend = () => {
      console.log('Speech ended:', speechText);
    };

    try {
      synth.speak(utterance);
    } catch (error) {
      console.error('Error initiating speech:', error);
      alert('صوت شروع کرنے میں خرابی ہوئی۔');
    }
  }
}
