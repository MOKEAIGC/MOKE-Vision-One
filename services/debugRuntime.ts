type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let installed = false;

function isDebugRuntimeEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_RUNTIME_DEBUG === '1';
}

function formatRequestUrl(input: FetchInput): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }

  return String(input);
}

function formatRequestMethod(input: FetchInput, init?: FetchInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return 'GET';
}

function installNetworkLogging(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: FetchInput, init?: FetchInit) => {
    const method = formatRequestMethod(input, init);
    const url = formatRequestUrl(input);
    const start = performance.now();

    console.info(`[DebugNetwork] -> ${method} ${url}`, init ?? {});

    try {
      const response = await originalFetch(input, init);
      const elapsed = Math.round(performance.now() - start);
      console.info(`[DebugNetwork] <- ${method} ${url} ${response.status} ${response.statusText} (${elapsed}ms)`);
      return response;
    } catch (error) {
      const elapsed = Math.round(performance.now() - start);
      console.error(`[DebugNetwork] xx ${method} ${url} (${elapsed}ms)`, error);
      throw error;
    }
  };
}

function installScriptErrorLogging(): void {
  window.addEventListener('error', (event) => {
    console.error('[DebugScript] window.error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[DebugScript] unhandledrejection', event.reason);
  });
}

export async function installDebugRuntime(): Promise<void> {
  if (typeof window === 'undefined' || installed || !isDebugRuntimeEnabled()) {
    return;
  }

  installed = true;

  console.info('[DebugRuntime] enabled', {
    tauri: Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__),
    userAgent: navigator.userAgent,
  });

  installNetworkLogging();
  installScriptErrorLogging();

  console.info('[DebugRuntime] Network request logging enabled');
  console.info('[DebugRuntime] Script error logging enabled');
  console.info('[DebugRuntime] Open WebView devtools with F12 or Ctrl+Shift+I');
}