import { Observable, Subscriber } from 'rxjs';
import { RequestConfig } from './Request';

export class RxRequest {
  get<T>(url: string, requestConfig?: RequestConfig): Observable<T> {
    return this.request('GET', url, undefined, requestConfig);
  }

  patch<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Observable<T> {
    return this.sendJsonData('PATCH', url, body, requestConfig);
  }

  post<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Observable<T> {
    return this.sendJsonData('POST', url, body, requestConfig);
  }

  put<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Observable<T> {
    return this.sendJsonData('PUT', url, body, requestConfig);
  }

  delete(url: string, requestConfig?: RequestConfig): Observable<void> {
    return this.request('DELETE', url, undefined, requestConfig);
  }

  private sendJsonData<B extends object, T>(
    method: string,
    url: string,
    body: B,
    requestConfig: RequestConfig = { headers: [] }
  ): Observable<T> {
    requestConfig.headers.push({ name: 'Content-Type', value: 'application/json' });
    return this.request(method, url, body, requestConfig);
  }

  private request<B extends object, T>(method: string, url: string, body?: B, requestConfig?: RequestConfig): Observable<T> {
    return new Observable<T>((subscriber) => {
      const req = new XMLHttpRequest();
      req.onreadystatechange = onReadyState<T>(subscriber);
      req.open(method, url);
      requestConfig?.headers.forEach((header) => req.setRequestHeader(header.name, header.value));
      req.send(JSON.stringify(body));
      return () => {
        req.abort();
      };
    });
  }
}

function onReadyState<T>(subscriber: Subscriber<T>): ((this: XMLHttpRequest, ev: Event) => any) | null {
  return function (this) {
    if (this.readyState === 4) {
      try {
        const jsonBody = this.responseText ? JSON.parse(this.responseText) : undefined;
        if (this.status >= 200 && this.status < 300) {
          if (jsonBody) {
            subscriber.next(jsonBody);
          }
          subscriber.complete();
        } else {
          const errorResponse = {
            status: this.status,
            statusText: this.statusText,
            payload: jsonBody,
          };
          subscriber.error(errorResponse);
        }
      } catch (err) {
        subscriber.error(err);
      }
    }
  };
}
