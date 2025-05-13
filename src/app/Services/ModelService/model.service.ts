
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelService {
  // private baseApiUrl = 'https://03b5-182-190-201-60.ngrok-free.app'; // Base URL for your FastAPI backend
  private baseApiUrl = 'https://0a31-2400-adc1-180-a600-dde3-328d-b1b0-3300.ngrok-free.app';
  constructor(private _httpClient: HttpClient) {}

  correctText(inputText: string, endpoint: string): Observable<any> {
    const payload = { input_text: inputText };
    const url = `${this.baseApiUrl}/${endpoint}`;
    return this._httpClient.post<any>(url, payload);
  }
}
