import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelService {

  // private apiUrl = 'https://localhost:7145/api/SentenceCorrection/correct'; // Replace with your backend API URL


  // private apiUrl = 'http://127.0.0.1:8000/correct_sentence';
  private apiUrl = 'https://03b5-182-190-201-60.ngrok-free.app';


  constructor(private _httpClient: HttpClient) {}

  correctSentence(inputSentence: string): Observable<any> {
    // Construct the payload to send as JSON (no need to use FormData for FastAPI)
    const payload = { input_sentence: inputSentence };

    return this._httpClient.post<any>(this.apiUrl, payload);
  }
  // correctSentence(inputSentence: string): Observable<any> {
  //   const formData = new FormData();
  //   formData.append('inputSentence', inputSentence);

  //   return this._httpClient.post<any>(this.apiUrl, formData);
  // }
}
