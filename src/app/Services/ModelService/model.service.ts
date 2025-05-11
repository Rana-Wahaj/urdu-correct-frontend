
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelService {
  private baseApiUrl = 'https://03b5-182-190-201-60.ngrok-free.app'; // Base URL for your FastAPI backend

  constructor(private _httpClient: HttpClient) {}

  correctText(inputText: string, endpoint: string): Observable<any> {
    const payload = { input_text: inputText };
    const url = `${this.baseApiUrl}/${endpoint}`;
    return this._httpClient.post<any>(url, payload);
  }
}
