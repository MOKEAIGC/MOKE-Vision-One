// 文件路径: components/satellite/map_app.ts
// 卫星-链路 3D 地图核心组件 — 基于 LitElement，Google Maps 3D API

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import hljs from 'highlight.js';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import { MapParams } from './mcp_maps_server';

/** Markdown 格式化与语法高亮 */
export const marked = new Marked(
  markedHighlight({
    async: true,
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, _info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const ICON_BUSY = html`<svg
  class="sat-rotating"
  xmlns="http://www.w3.org/2000/svg"
  height="24px"
  viewBox="0 -960 960 960"
  width="24px"
  fill="currentColor">
  <path
    d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
</svg>`;

/**
 * 聊天状态枚举
 */
export enum ChatState {
  IDLE,
  GENERATING,
  THINKING,
  EXECUTING,
}

/**
 * 聊天标签枚举
 */
enum ChatTab {
  GEMINI,
  ALBUM,
}

/**
 * 聊天角色枚举
 */
export enum ChatRole {
  USER,
  ASSISTANT,
  SYSTEM,
}

// Google Maps API Key — 请在运行时配置，不要硬编码
const USER_PROVIDED_GOOGLE_MAPS_API_KEY: string = '';

const EXAMPLE_PROMPTS = [
  "带我看看东京塔到涩谷十字路口的路线",
  "给我看一片美丽的海滩",
  "带我去旧金山",
  "从埃菲尔铁塔到卢浮宫的路线",
  "带我看看夏威夷钻石头山",
  "去威尼斯看看",
  "世界最北端的首都城市在哪里？",
  "带我去马丘比丘",
  "给我看看中国三峡大坝",
  "从时代广场到中央公园怎么走？",
  "给我看看金门大桥到恶魔岛的路线",
  "Show me directions from Tokyo Tower to Shibuya Crossing.",
  "Can you show me a beautiful beach?",
  "Show me San Francisco",
  "Give me directions from the Eiffel Tower to the Louvre Museum.",
];

/**
 * 卫星-链路 3D 地图 LitElement 组件
 */
@customElement('moke-satellite-map')
export class SatelliteMapApp extends LitElement {
  @query('#sat-anchor') anchor?: HTMLDivElement;
  @query('#sat-mapContainer') mapContainerElement?: HTMLElement;
  @query('#sat-messageInput') messageInputElement?: HTMLInputElement;

  @state() chatState = ChatState.IDLE;
  @state() isRunning = true;
  @state() selectedChatTab = ChatTab.GEMINI;
  @state() inputMessage = '';
  @state() messages: HTMLElement[] = [];
  @state() mapInitialized = false;
  @state() mapError = '';
  @state() sidebarCollapsed = false;
  @state() fieldOfView = 45;
  @state() showMapUI = false;
  @state() showLogo = true;
  @state() screenshots: string[] = [];
  @state() isFlashing = false;
  @state() showViewfinder = true;

  private map?: any;
  private geocoder?: any;
  private marker?: any;
  private Map3DElement?: any;
  private Marker3DElement?: any;
  private Polyline3DElement?: any;
  private directionsService?: any;
  private routePolyline?: any;
  private originMarker?: any;
  private destinationMarker?: any;

  sendMessageHandler?: CallableFunction;

  constructor() {
    super();
    this.setNewRandomPrompt();
  }

  createRenderRoot() {
    return this;
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    this.loadMap();
  }

  private setNewRandomPrompt() {
    if (EXAMPLE_PROMPTS.length > 0) {
      this.inputMessage =
        EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    }
  }

  async loadMap() {
    const isApiKeyPlaceholder =
      USER_PROVIDED_GOOGLE_MAPS_API_KEY ===
        'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_REPLACE_ME' ||
      USER_PROVIDED_GOOGLE_MAPS_API_KEY === '';

    if (isApiKeyPlaceholder) {
      this.mapError = `Google Maps API Key 未配置。请在 map_app.ts 中设置 USER_PROVIDED_GOOGLE_MAPS_API_KEY。`;
      console.error(this.mapError);
      this.requestUpdate();
      return;
    }

    // 使用 v2 API: setOptions + importLibrary
    setOptions({
      key: USER_PROVIDED_GOOGLE_MAPS_API_KEY,
      v: 'beta',
      libraries: ['geocoding', 'routes', 'geometry'],
    });

    try {
      // 导入 maps3d 库
      const maps3dLibrary = await importLibrary('maps3d') as any;
      this.Map3DElement = maps3dLibrary.Map3DElement;
      this.Marker3DElement = maps3dLibrary.Marker3DElement;
      this.Polyline3DElement = maps3dLibrary.Polyline3DElement;

      // 导入核心库确保 google.maps 可用
      await importLibrary('geocoding');
      await importLibrary('routes');
      await importLibrary('geometry');

      if ((window as any).google && (window as any).google.maps) {
        this.directionsService = new (
          window as any
        ).google.maps.DirectionsService();
      } else {
        console.error('DirectionsService not loaded.');
      }

      this.initializeMap();
      this.mapInitialized = true;
      this.mapError = '';
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      this.mapError = '无法加载 Google Maps。请检查控制台和 API 密钥。';
      this.mapInitialized = false;
    }
    this.requestUpdate();
  }

  initializeMap() {
    if (!this.mapContainerElement || !this.Map3DElement) {
      console.error('Map container or Map3DElement class not ready.');
      return;
    }
    this.map = this.mapContainerElement;
    if ((window as any).google && (window as any).google.maps) {
      this.geocoder = new (window as any).google.maps.Geocoder();
    } else {
      console.error('Geocoder not loaded.');
    }
  }

  setChatState(state: ChatState) {
    this.chatState = state;
  }

  private _clearMapElements() {
    if (this.marker) {
      this.marker.remove();
      this.marker = undefined;
    }
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = undefined;
    }
    if (this.originMarker) {
      this.originMarker.remove();
      this.originMarker = undefined;
    }
    if (this.destinationMarker) {
      this.destinationMarker.remove();
      this.destinationMarker = undefined;
    }
  }

  private async _handleViewLocation(locationQuery: string) {
    if (
      !this.mapInitialized ||
      !this.map ||
      !this.geocoder ||
      !this.Marker3DElement
    ) {
      if (!this.mapError) {
        const { textElement } = this.addMessage('error', '处理错误...');
        textElement.innerHTML = await marked.parse(
          '地图尚未就绪。请检查配置。',
        );
      }
      return;
    }
    this._clearMapElements();

    this.geocoder.geocode(
      { address: locationQuery },
      async (results: any, status: string) => {
        if (status === 'OK' && results && results[0] && this.map) {
          const location = results[0].geometry.location;

          const cameraOptions = {
            center: { lat: location.lat(), lng: location.lng(), altitude: 0 },
            heading: 0,
            tilt: 67.5,
            range: 2000,
          };
          (this.map as any).flyCameraTo({
            endCamera: cameraOptions,
            durationMillis: 1500,
          });

          this.marker = new this.Marker3DElement();
          this.marker.position = {
            lat: location.lat(),
            lng: location.lng(),
            altitude: 0,
          };
          const label =
            locationQuery.length > 30
              ? locationQuery.substring(0, 27) + '...'
              : locationQuery;
          this.marker.label = label;
          (this.map as any).appendChild(this.marker);
        } else {
          const rawErrorMessage = `找不到位置: ${locationQuery}。原因: ${status}`;
          const { textElement } = this.addMessage('error', '处理错误...');
          textElement.innerHTML = await marked.parse(rawErrorMessage);
        }
      },
    );
  }

  private async _handleDirections(
    originQuery: string,
    destinationQuery: string,
  ) {
    if (
      !this.mapInitialized ||
      !this.map ||
      !this.directionsService ||
      !this.Marker3DElement ||
      !this.Polyline3DElement
    ) {
      if (!this.mapError) {
        const { textElement } = this.addMessage('error', '处理错误...');
        textElement.innerHTML = await marked.parse(
          '地图尚未就绪。请检查配置。',
        );
      }
      return;
    }
    this._clearMapElements();

    this.directionsService.route(
      {
        origin: originQuery,
        destination: destinationQuery,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      },
      async (response: any, status: string) => {
        if (
          status === 'OK' &&
          response &&
          response.routes &&
          response.routes.length > 0
        ) {
          const route = response.routes[0];

          if (route.overview_path && this.Polyline3DElement) {
            const pathCoordinates = route.overview_path.map((p: any) => ({
              lat: p.lat(),
              lng: p.lng(),
              altitude: 5,
            }));
            this.routePolyline = new this.Polyline3DElement();
            this.routePolyline.coordinates = pathCoordinates;
            this.routePolyline.strokeColor = '#D00000';
            this.routePolyline.strokeWidth = 10;
            (this.map as any).appendChild(this.routePolyline);
          }

          if (
            route.legs &&
            route.legs[0] &&
            route.legs[0].start_location &&
            this.Marker3DElement
          ) {
            const originLocation = route.legs[0].start_location;
            this.originMarker = new this.Marker3DElement();
            this.originMarker.position = {
              lat: originLocation.lat(),
              lng: originLocation.lng(),
              altitude: 0,
            };
            this.originMarker.label = '起点';
            this.originMarker.style = {
              color: { r: 0, g: 128, b: 0, a: 1 },
            };
            (this.map as any).appendChild(this.originMarker);
          }

          if (
            route.legs &&
            route.legs[0] &&
            route.legs[0].end_location &&
            this.Marker3DElement
          ) {
            const destinationLocation = route.legs[0].end_location;
            this.destinationMarker = new this.Marker3DElement();
            this.destinationMarker.position = {
              lat: destinationLocation.lat(),
              lng: destinationLocation.lng(),
              altitude: 0,
            };
            this.destinationMarker.label = '终点';
            this.destinationMarker.style = {
              color: { r: 208, g: 0, b: 0, a: 1 },
            };
            (this.map as any).appendChild(this.destinationMarker);
          }

          if (route.bounds) {
            const bounds = route.bounds;
            const center = bounds.getCenter();
            let range = 10000;

            if (
              (window as any).google.maps.geometry &&
              (window as any).google.maps.geometry.spherical
            ) {
              const spherical = (window as any).google.maps.geometry.spherical;
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              const diagonalDistance = spherical.computeDistanceBetween(ne, sw);
              range = diagonalDistance * 1.7;
            }

            range = Math.max(range, 2000);

            const cameraOptions = {
              center: { lat: center.lat(), lng: center.lng(), altitude: 0 },
              heading: 0,
              tilt: 45,
              range: range,
            };
            (this.map as any).flyCameraTo({
              endCamera: cameraOptions,
              durationMillis: 2000,
            });
          }
        } else {
          const rawErrorMessage = `无法获取从 "${originQuery}" 到 "${destinationQuery}" 的路线。原因: ${status}`;
          const { textElement } = this.addMessage('error', '处理错误...');
          textElement.innerHTML = await marked.parse(rawErrorMessage);
        }
      },
    );
  }

  async handleMapQuery(params: MapParams) {
    if (params.location) {
      this._handleViewLocation(params.location);
    } else if (params.origin && params.destination) {
      this._handleDirections(params.origin, params.destination);
    } else if (params.destination) {
      this._handleViewLocation(params.destination);
    }
  }

  setInputField(message: string) {
    this.inputMessage = message.trim();
  }

  addMessage(role: string, message: string) {
    const div = document.createElement('div');
    div.classList.add('sat-turn');
    div.classList.add(`sat-role-${role.trim()}`);
    div.setAttribute('aria-live', 'polite');

    const thinkingDetails = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = '思考过程';
    thinkingDetails.classList.add('sat-thinking');
    const thinkingElement = document.createElement('div');
    thinkingDetails.append(summary);
    thinkingDetails.append(thinkingElement);
    div.append(thinkingDetails);

    const textElement = document.createElement('div');
    textElement.className = 'sat-text';
    textElement.innerHTML = message;
    div.append(textElement);

    this.messages = [...this.messages, div];
    this.scrollToTheEnd();
    return {
      thinkingContainer: thinkingDetails,
      thinkingElement: thinkingElement,
      textElement: textElement,
    };
  }

  scrollToTheEnd() {
    if (!this.anchor) return;
    this.anchor.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }

  async sendMessageAction(message?: string, role?: string) {
    if (this.chatState !== ChatState.IDLE) return;

    let msg = '';
    let usedComponentInput = false;

    if (message) {
      msg = message.trim();
    } else {
      msg = this.inputMessage.trim();
      if (msg.length > 0) {
        this.inputMessage = '';
        usedComponentInput = true;
      } else if (
        this.inputMessage.trim().length === 0 &&
        this.inputMessage.length > 0
      ) {
        this.inputMessage = '';
        usedComponentInput = true;
      }
    }

    if (msg.length === 0) {
      if (usedComponentInput) {
        this.setNewRandomPrompt();
      }
      return;
    }

    const msgRole = role ? role.toLowerCase() : 'user';

    if (msgRole === 'user' && msg) {
      const { textElement } = this.addMessage(msgRole, '...');
      textElement.innerHTML = await marked.parse(msg);
    }

    if (this.sendMessageHandler) {
      await this.sendMessageHandler(msg, msgRole);
    }

    if (usedComponentInput) {
      this.setNewRandomPrompt();
    }
  }

  private async inputKeyDownAction(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessageAction();
    }
  }

  private _toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private _findMapCanvas(): HTMLCanvasElement | null {
    const canvases: HTMLCanvasElement[] = [];

    const traverse = (node: Node | ShadowRoot) => {
      if (node instanceof HTMLCanvasElement) {
        canvases.push(node);
      }
      if (node instanceof HTMLElement && node.shadowRoot) {
        traverse(node.shadowRoot);
      }
      node.childNodes.forEach((child) => traverse(child));
    };

    traverse(document.body);
    if (this.mapContainerElement) {
      traverse(this.mapContainerElement);
    }

    document.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) traverse(el.shadowRoot);
    });

    if (canvases.length === 0) return null;

    const likelyMapCanvases = canvases.filter(
      (c) => c.width > 200 && c.height > 200,
    );

    if (likelyMapCanvases.length === 0) return canvases[0];

    return likelyMapCanvases.reduce((prev, current) => {
      return prev.width * prev.height > current.width * current.height
        ? prev
        : current;
    });
  }

  private async _takeScreenshot() {
    this.isFlashing = true;
    setTimeout(() => {
      this.isFlashing = false;
    }, 500);

    const canvas = this._findMapCanvas();
    if (!canvas) {
      alert('未找到地图画布。请确保地图已完全加载。');
      return;
    }

    try {
      let dataUrl = canvas.toDataURL('image/png');

      if (dataUrl === 'data:,' || dataUrl.length < 1000) {
        if (this.map) {
          const currentTilt = parseFloat(
            this.map.getAttribute('tilt') || '45',
          );
          this.map.setAttribute('tilt', (currentTilt + 0.001).toString());
          await new Promise((resolve) => requestAnimationFrame(resolve));
          dataUrl = canvas.toDataURL('image/png');
          this.map.setAttribute('tilt', currentTilt.toString());
        }
      }

      if (dataUrl === 'data:,' || dataUrl.length < 1000) {
        alert('截图为空。请尝试移动地图后再试。');
        return;
      }

      this.screenshots = [dataUrl, ...this.screenshots];

      const link = document.createElement('a');
      link.download = `satellite-screenshot-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('截图失败。可能由于跨域限制。');
    }
  }

  private _toggleViewfinder(e: Event) {
    this.showViewfinder = (e.target as HTMLInputElement).checked;
  }

  private _updateFOV(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.fieldOfView = value;
    if (this.map) {
      this.map.setAttribute('field-of-view', value.toString());
    }
  }

  private _toggleMapUI(e: Event) {
    this.showMapUI = (e.target as HTMLInputElement).checked;
    if (this.map) {
      this.map.setAttribute(
        'default-ui-disabled',
        (!this.showMapUI).toString(),
      );
    }
  }

  private _toggleLogo(e: Event) {
    this.showLogo = (e.target as HTMLInputElement).checked;
    this._updateLogoVisibility();
  }

  private _updateLogoVisibility() {
    if (!this.mapContainerElement) return;
    const styleId = 'gmp-hide-logo-style';
    let styleEl = this.mapContainerElement.shadowRoot?.getElementById(
      styleId,
    ) as HTMLStyleElement;

    if (!this.showLogo) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          .gm-style-cc, .gmnoprint, a[href^="https://maps.google.com/maps"], a[href^="https://www.google.com/intl/en-US_US/help/terms_maps.html"], .gm-control-active {
            display: none !important;
          }
          img[src*="google_white"], img[src*="google4"] {
            display: none !important;
          }
        `;
        this.mapContainerElement.shadowRoot?.appendChild(styleEl);
      }
    } else {
      styleEl?.remove();
    }
  }

  private _deleteScreenshot(index: number) {
    this.screenshots = this.screenshots.filter((_, i) => i !== index);
  }

  render() {
    const initialCenter = '0,0,100';
    const initialRange = '20000000';
    const initialTilt = '45';
    const initialHeading = '0';

    return html`<div class="sat-map-app">
      <div class="sat-main-container" role="application" aria-label="3D 交互地图">

        <div class="sat-flash-overlay ${classMap({ 'sat-active': this.isFlashing })}"></div>

        ${this.showViewfinder
          ? html`
              <div class="sat-camera-viewfinder">
                <div class="sat-corner sat-top-left"></div>
                <div class="sat-corner sat-top-right"></div>
                <div class="sat-corner sat-bottom-left"></div>
                <div class="sat-corner sat-bottom-right"></div>
                <div class="sat-center-cross"></div>
              </div>
            `
          : ''}

        <button class="sat-sidebar-toggle" @click=${this._toggleSidebar} title="切换侧栏">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
          </svg>
        </button>

        <div class="sat-map-controls">
          <div class="sat-control-group">
            <label>相机焦距 (FOV)</label>
            <input type="range" min="10" max="120" .value=${this.fieldOfView} @input=${this._updateFOV} />
            <div class="sat-value-display">${this.fieldOfView}°</div>
          </div>

          <div class="sat-control-group">
            <div class="sat-toggle-switch">
              <label>显示地图 UI</label>
              <input type="checkbox" .checked=${this.showMapUI} @change=${this._toggleMapUI} />
            </div>
          </div>

          <div class="sat-control-group">
            <div class="sat-toggle-switch">
              <label>显示 Logo</label>
              <input type="checkbox" .checked=${this.showLogo} @change=${this._toggleLogo} />
            </div>
          </div>

          <div class="sat-control-group">
            <div class="sat-toggle-switch">
              <label>取景器</label>
              <input type="checkbox" .checked=${this.showViewfinder} @change=${this._toggleViewfinder} />
            </div>
          </div>

          <button class="sat-map-btn" @click=${this._takeScreenshot}>
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M440-440ZM120-120q-33 0-56.5-23.5T40-200v-480q0-33 23.5-56.5T120-760h126l74-80h320l74 80h126q33 0 56.5 23.5T920-680v480q0 33-23.5 56.5T800-120H120Zm0-80h680v-480H674l-74-80H360l-74 80H120v480Zm360-80q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-280Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z" />
            </svg>
            截图
          </button>
        </div>

        ${this.mapError
          ? html`<div class="sat-map-error-message" role="alert">${this.mapError}</div>`
          : ''}

        <gmp-map-3d
          id="sat-mapContainer"
          style="height: 100%; width: 100%;"
          aria-label="Google 3D 地图"
          mode="hybrid"
          center="${initialCenter}"
          heading="${initialHeading}"
          tilt="${initialTilt}"
          range="${initialRange}"
          field-of-view="${this.fieldOfView}"
          default-ui-disabled="true"
          gesture-handling="greedy"
          role="application">
        </gmp-map-3d>
      </div>

      <div class="sat-sidebar ${classMap({ 'sat-collapsed': this.sidebarCollapsed })}" role="complementary">
        <div class="sat-selector" role="tablist">
          <button
            role="tab"
            aria-selected=${this.selectedChatTab === ChatTab.GEMINI}
            class=${classMap({ 'sat-selected-tab': this.selectedChatTab === ChatTab.GEMINI })}
            @click=${() => { this.selectedChatTab = ChatTab.GEMINI; }}>
            <span>AI 对话</span>
          </button>
          <button
            role="tab"
            aria-selected=${this.selectedChatTab === ChatTab.ALBUM}
            class=${classMap({ 'sat-selected-tab': this.selectedChatTab === ChatTab.ALBUM })}
            @click=${() => { this.selectedChatTab = ChatTab.ALBUM; }}>
            <span>相册 (${this.screenshots.length})</span>
          </button>
        </div>

        <div class=${classMap({ 'sat-tabcontent': true, 'sat-showtab': this.selectedChatTab === ChatTab.GEMINI })}>
          <div class="sat-chat-messages">
            ${this.messages}
            <div id="sat-anchor"></div>
          </div>
          <div class="sat-footer">
            <div class=${classMap({ 'sat-chat-status': true, 'sat-hidden': this.chatState === ChatState.IDLE })}>
              ${this.chatState === ChatState.GENERATING ? html`${ICON_BUSY} 生成中...` : html``}
              ${this.chatState === ChatState.THINKING ? html`${ICON_BUSY} 思考中...` : html``}
              ${this.chatState === ChatState.EXECUTING ? html`${ICON_BUSY} 执行中...` : html``}
            </div>
            <div class="sat-input-area">
              <input
                type="text"
                id="sat-messageInput"
                .value=${this.inputMessage}
                @input=${(e: InputEvent) => { this.inputMessage = (e.target as HTMLInputElement).value; }}
                @keydown=${(e: KeyboardEvent) => { this.inputKeyDownAction(e); }}
                placeholder="输入消息..."
                autocomplete="off" />
              <button
                class="sat-send-btn ${classMap({ 'sat-disabled': this.chatState !== ChatState.IDLE })}"
                @click=${() => { this.sendMessageAction(); }}
                ?disabled=${this.chatState !== ChatState.IDLE}
                aria-label="发送消息">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                  <path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class=${classMap({ 'sat-tabcontent': true, 'sat-showtab': this.selectedChatTab === ChatTab.ALBUM })}>
          <div class="sat-album-grid">
            ${this.screenshots.length === 0
              ? html`<div class="sat-empty-album">暂无截图。使用地图上的截图按钮！</div>`
              : this.screenshots.map(
                  (src, index) => html`
                    <div class="sat-album-item">
                      <img
                        src="${src}"
                        alt="截图 ${index + 1}"
                        @click=${() => {
                          const link = document.createElement('a');
                          link.download = `satellite-screenshot-${index}.png`;
                          link.href = src;
                          link.click();
                        }} />
                      <button class="sat-delete-btn" @click=${() => this._deleteScreenshot(index)}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T760-120H280Zm480-600H280v520h480v-520ZM360-280h80v-360h-80v360Zm160-0h80v-360h-80v360ZM280-720v520-520Z" />
                        </svg>
                      </button>
                    </div>
                  `,
                )}
          </div>
        </div>
      </div>
    </div>`;
  }
}
