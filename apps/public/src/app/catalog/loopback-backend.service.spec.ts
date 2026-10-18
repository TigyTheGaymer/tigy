import {
  FetchBackend,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { DOCUMENT, REQUEST_CONTEXT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  LoopbackBackendService,
  loopbackUrl,
} from './loopback-backend.service';

const PAGE = 'https://tigy.example';
const API = 'http://localhost:8080';

describe('loopbackUrl', () => {
  it("sends a request for the page's own /api/ to the server's own port", () => {
    expect(loopbackUrl(`${PAGE}/api/gallery?tag=comic`, PAGE, API)).toBe(
      `${API}/api/gallery?tag=comic`,
    );
    expect(loopbackUrl('/api/artworks/k3x', PAGE, API)).toBe(
      `${API}/api/artworks/k3x`,
    );
  });

  it('leaves every other address alone', () => {
    for (const url of [
      `${PAGE}/img/k3x/thumb.webp`,
      `${PAGE}/apis`,
      `${PAGE}/api`,
      'https://elsewhere.example/api/gallery',
      '/sitemap.xml',
    ]) {
      expect(loopbackUrl(url, PAGE, API)).toBe(url);
    }
  });
});

describe('LoopbackBackendService', () => {
  let sent: HttpRequest<unknown>[];

  function backend(context: unknown): LoopbackBackendService {
    sent = [];
    TestBed.configureTestingModule({
      providers: [
        LoopbackBackendService,
        {
          provide: FetchBackend,
          useValue: {
            handle: (req: HttpRequest<unknown>) => {
              sent.push(req);
              return of(new HttpResponse({ status: 200 }));
            },
          },
        },
        {
          provide: DOCUMENT,
          useValue: { location: { origin: PAGE } },
        },
        { provide: REQUEST_CONTEXT, useValue: context },
      ],
    });
    return TestBed.inject(LoopbackBackendService);
  }

  it('rewrites an /api/ request, keeping its parameters', async () => {
    const loopback = backend({ apiOrigin: API });
    await firstValueFrom(
      loopback.handle(
        new HttpRequest('GET', `${PAGE}/api/gallery`, {
          params: new HttpParams().appendAll({ tag: ['a', 'b'], nsfw: '1' }),
        }),
      ),
    );
    expect(sent.map((req) => req.urlWithParams)).toEqual([
      `${API}/api/gallery?tag=a&tag=b&nsfw=1`,
    ]);
  });

  it('sends every other request unchanged', async () => {
    const loopback = backend({ apiOrigin: API });
    const request = new HttpRequest('GET', 'https://elsewhere.example/api/x');
    await firstValueFrom(loopback.handle(request));
    expect(sent).toEqual([request]);
  });

  it('changes nothing without a render context', async () => {
    const loopback = backend(null);
    const request = new HttpRequest('GET', `${PAGE}/api/home`);
    await firstValueFrom(loopback.handle(request));
    expect(sent).toEqual([request]);
  });
});
