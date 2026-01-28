export type Header = { name: string; value: string };
export type RequestConfig = {
  headers: Header[];
};

export default class Request {
  private request<B extends object, T>(method: string, url: string, body?: B, requestConfig?: RequestConfig): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.onreadystatechange = onReadyState<T>(resolve, reject);
      req.open(method, url);
      requestConfig?.headers.forEach((header) => req.setRequestHeader(header.name, header.value));
      req.send(JSON.stringify(body));
    });
  }

  async get<T>(url: string, requestConfig?: RequestConfig): Promise<T> {
    return this.request('GET', url, undefined, requestConfig);
  }

  async patch<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Promise<T> {
    return this.sendJsonData('PATCH', url, body, requestConfig);
  }

  async post<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Promise<T> {
    return this.sendJsonData('POST', url, body, requestConfig);
  }

  async put<B extends object, T>(url: string, body: B, requestConfig?: RequestConfig): Promise<T> {
    return this.sendJsonData('PUT', url, body, requestConfig);
  }

  async delete<T>(url: string, requestConfig?: RequestConfig): Promise<T> {
    return this.request('DELETE', url, undefined, requestConfig);
  }

  private async sendJsonData<B extends object, T>(
    method: string,
    url: string,
    body: B,
    requestConfig: RequestConfig = { headers: [] }
  ): Promise<T> {
    requestConfig.headers.push({ name: 'Content-Type', value: 'application/json' });
    return this.request(method, url, body, requestConfig);
  }
}

function onReadyState<T>(
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: any) => void
) {
  return function(this: XMLHttpRequest) {
    if (this.readyState === XMLHttpRequest.DONE) {
      if (this.status >= 200 && this.status < 300) {
        try {
          const data = JSON.parse(this.responseText) as T;
          resolve(data);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Request failed with status ${this.status}`));
      }
    }
  };
}

