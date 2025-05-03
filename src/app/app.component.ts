import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpeechService } from './Services/SpeechService/speech.service';
import { saveAs } from 'file-saver'; // Import FileSaver.js
import { ChatComponent } from './Chat/chat/chat.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule , ChatComponent],
})
export class AppComponent {
  userSentence: string = ''; // Recognized text
  isListening: boolean = false; // Track if the app is listening
  recorder: MediaRecorder | null = null; // MediaRecorder instance
  audioChunks: Blob[] = []; // Buffer to store recorded audio chunks
  speechService = inject(SpeechService); // Inject SpeechService

  // Toggle voice recording
  toggleRecording() {
    if (this.isListening) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // Start recording
  startRecording() {
    this.isListening = true;
    console.log('Listening...');

    // Access the microphone
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.recorder = new MediaRecorder(stream);

        // Capture audio chunks
        this.recorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        // When recording stops, process the audio
        this.recorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioChunks = []; // Clear chunks for next recording
          this.convertToWav(audioBlob); // Convert to WAV and save locally
        };

        // Start recording
        this.recorder.start();
      })
      .catch((error) => {
        console.error('Error accessing microphone:', error);
        alert('Could not access the microphone. Please check your permissions.');
        this.isListening = false;
      });
  }

  // Stop recording
  stopRecording() {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
      this.isListening = false;
      console.log('Stopped Listening.');
    }
  }

  // Convert audio/webm to audio/wav and save locally
  convertToWav(audioBlob: Blob) {
    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const wavBlob = this.exportWav(audioBuffer);
        this.saveWavFile(wavBlob); // Save the WAV file locally
      });
    };

    reader.readAsArrayBuffer(audioBlob);
  }

  // Export audio buffer as WAV
  exportWav(audioBuffer: AudioBuffer): Blob {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numOfChannels * 2 + 44;

    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    // Write WAV header
    this.writeWavHeader(view, audioBuffer);

    // Write interleaved audio
    const channelData = new Float32Array(audioBuffer.length * numOfChannels);
    for (let channel = 0; channel < numOfChannels; channel++) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        channelData[i * numOfChannels + channel] = data[i];
      }
    }

    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      view.setInt16(offset, channelData[i] * 0x7fff, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // Write WAV file header
  writeWavHeader(view: DataView, audioBuffer: AudioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const blockAlign = numOfChannels * 2;
    const byteRate = sampleRate * blockAlign;

    view.setUint32(0, 0x46464952, false); // "RIFF"
    view.setUint32(4, 36 + audioBuffer.length * blockAlign, true);
    view.setUint32(8, 0x45564157, false); // "WAVE"
    view.setUint32(12, 0x20746d66, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    view.setUint32(36, 0x61746164, false); // "data"
    view.setUint32(40, audioBuffer.length * blockAlign, true);
  }

  // Save the WAV file locally
  saveWavFile(wavBlob: Blob) {
    const fileName = 'audio_recording.wav';
    saveAs(wavBlob, fileName); // Use FileSaver.js to prompt the download
    console.log(`File saved as ${fileName}`);
  }
}
