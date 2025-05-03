import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SpeechService {
  private baseUrl = 'https://localhost:7145/api/Speech'; // Ensure this matches your API

  // private baseUrl = 'http://127.0.0.1:8000'; // URL for your FastAPI server


  private http = inject(HttpClient); // Inject HttpClient

  speechToText(audioBlob: Blob): Observable<string> {
    const formData = new FormData();
    formData.append('audioFile', audioBlob, 'audio.wav'); // Attach the audio blob as .wav
    return this.http.post(`${this.baseUrl}/stt`, formData, { responseType: 'text' });
  }

  textToSpeech(text: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('text', text);
    return this.http.post(`${this.baseUrl}/tts`, formData, { responseType: 'blob' });
  }

  // private backendUrl = 'http://localhost:5000/api/speech/transcribe';  // Adjust for your backend API URL

  // constructor(private http: HttpClient) { }

  // transcribeAudio(blob: Blob): Observable<any> {
  //   const file = new File([blob], 'audio.wav', { type: blob.type, lastModified: Date.now() });
  //   const formData = new FormData();
  //   formData.append('audioFile', file, file.name);

  //   return this.http.post<any>(this.backendUrl, formData);
  // }
}
