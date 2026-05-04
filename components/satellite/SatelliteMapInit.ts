// 文件路径: components/satellite/SatelliteMapInit.ts
// 卫星-链路初始化模块 — 创建 Gemini AI + MCP 通信 + 绑定到 MapApp 组件
// 此模块从 index.tsx 中提取的初始化逻辑，封装为可复用函数

import { GoogleGenAI, mcpToTool } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { ChatState, SatelliteMapApp, marked } from './map_app';
import { startMcpGoogleMapServer } from './mcp_maps_server';

async function startClient(transport: Transport) {
  const client = new Client({ name: 'MOKE Satellite', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

const SYSTEM_INSTRUCTIONS = `你是一位专业的地图专家和旅行向导，精通地图和发现有趣的地点。
你的主要目标是使用可用工具在交互式地图上显示相关信息来协助用户。

工具使用指南：
1.  **先确定具体位置：** 使用 'view_location_google_maps' 或 'directions_on_google_maps' 之前，你必须先确定一个具体的地名、地址或著名地标。
    *   **好的例子：** 用户问"最南端的城镇在哪里？"你想："最南端的永久居住地是智利的威廉斯港。"然后你调用 'view_location_google_maps'，参数为: "Puerto Williams, Chile"。
    *   **坏的例子：** 直接用模糊词汇搜索，如"最南端的城镇"。
2.  **明确起终点：** 使用 'directions_on_google_maps' 时，确保 'origin' 和 'destination' 都是具体的地名或地址。
3.  **解释你的操作：** 在调用工具前，简要说明你要展示什么位置。
4.  **简洁响应：** 地图操作本身就是响应，不需要重复说明"正在地图上显示"。可以在操作后提供有趣的信息。
5.  **不确定时询问：** 如果请求太模糊，请询问更多细节。
6.  **支持中英文：** 用户可能使用中文或英文提问，请用相同语言回复。`;

function camelCaseToDash(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * 初始化卫星-链路地图系统
 * @param mapApp - Lit Element 地图组件实例
 * @param apiKey - Gemini API Key（从主应用配置获取）
 */
export async function initSatelliteMapSystem(
  mapApp: SatelliteMapApp,
  apiKey?: string,
) {
  // 使用传入的 apiKey 或环境变量
  const effectiveKey = apiKey || (typeof process !== 'undefined' && process.env?.API_KEY) || '';

  if (!effectiveKey) {
    const { textElement } = mapApp.addMessage('error', '');
    textElement.innerHTML = await marked.parse(
      '⚠️ **Gemini API Key 未配置**\n\n请在主页面的 ⚙️ API 设置中配置 Gemini API Key，然后重新打开卫星-链路。',
    );
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    const [transportA, transportB] = InMemoryTransport.createLinkedPair();

    void startMcpGoogleMapServer(
      transportA,
      (params: { location?: string; origin?: string; destination?: string }) => {
        mapApp.handleMapQuery(params);
      },
    );

    const mcpClient = await startClient(transportB);

    const aiChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
        tools: [mcpToTool(mcpClient)],
      },
    });

    mapApp.sendMessageHandler = async (input: string, role: string) => {
      console.log('[Satellite] sendMessageHandler', input, role);

      const { thinkingElement, textElement, thinkingContainer } =
        mapApp.addMessage('assistant', '');

      mapApp.setChatState(ChatState.GENERATING);
      textElement.innerHTML = '...';

      let newCode = '';
      let thoughtAccumulator = '';

      try {
        try {
          const stream = await aiChat.sendMessageStream({ message: input });

          for await (const chunk of stream) {
            for (const candidate of chunk.candidates ?? []) {
              for (const part of candidate.content?.parts ?? []) {
                if (part.functionCall) {
                  console.log(
                    '[Satellite] FUNCTION CALL:',
                    part.functionCall.name,
                    part.functionCall.args,
                  );
                  const mcpCall = {
                    name: camelCaseToDash(part.functionCall.name!),
                    arguments: part.functionCall.args,
                  };

                  const explanation =
                    '调用工具:\n```json\n' +
                    JSON.stringify(mcpCall, null, 2) +
                    '\n```';
                  const { textElement: functionCallText } = mapApp.addMessage(
                    'assistant',
                    '',
                  );
                  functionCallText.innerHTML = await marked.parse(explanation);
                }

                if (part.thought) {
                  mapApp.setChatState(ChatState.THINKING);
                  thoughtAccumulator += ' ' + part.thought;
                  thinkingElement.innerHTML =
                    await marked.parse(thoughtAccumulator);
                  if (thinkingContainer) {
                    thinkingContainer.classList.remove('sat-hidden');
                    thinkingContainer.setAttribute('open', 'true');
                  }
                } else if (part.text) {
                  mapApp.setChatState(ChatState.EXECUTING);
                  newCode += part.text;
                  textElement.innerHTML = await marked.parse(newCode);
                }
                mapApp.scrollToTheEnd();
              }
            }
          }
        } catch (e: unknown) {
          console.error('[Satellite] GenAI SDK Error:', e);
          let baseErrorText: string;

          if (e instanceof Error) {
            baseErrorText = e.message;
          } else if (typeof e === 'string') {
            baseErrorText = e;
          } else {
            try {
              baseErrorText = `意外错误: ${JSON.stringify(e)}`;
            } catch (_) {
              baseErrorText = `意外错误: ${String(e)}`;
            }
          }

          let finalErrorMessage = baseErrorText;

          const jsonStartIndex = baseErrorText.indexOf('{');
          const jsonEndIndex = baseErrorText.lastIndexOf('}');

          if (jsonStartIndex > -1 && jsonEndIndex > jsonStartIndex) {
            const potentialJson = baseErrorText.substring(
              jsonStartIndex,
              jsonEndIndex + 1,
            );
            try {
              const sdkError = JSON.parse(potentialJson);
              if (sdkError?.error?.message) {
                finalErrorMessage = sdkError.error.message;
              } else if (sdkError?.message) {
                finalErrorMessage = sdkError.message;
              }
            } catch (_) {
              // 解析失败，使用原始错误
            }
          }

          const { textElement: errorTextElement } = mapApp.addMessage(
            'error',
            '',
          );
          errorTextElement.innerHTML = await marked.parse(
            `错误: ${finalErrorMessage}`,
          );
        }

        if (thinkingContainer && thinkingContainer.hasAttribute('open')) {
          if (!thoughtAccumulator) {
            thinkingContainer.classList.add('sat-hidden');
          }
          thinkingContainer.removeAttribute('open');
        }

        if (
          textElement.innerHTML.trim() === '...' ||
          textElement.innerHTML.trim().length === 0
        ) {
          const hasFunctionCallMessage = mapApp.messages.some((el) =>
            el.innerHTML.includes('调用工具:'),
          );
          if (!hasFunctionCallMessage) {
            textElement.innerHTML = await marked.parse('完成。');
          } else if (textElement.innerHTML.trim() === '...') {
            textElement.innerHTML = '';
          }
        }
      } finally {
        mapApp.setChatState(ChatState.IDLE);
      }
    };

    // 添加欢迎消息
    const { textElement: welcomeText } = mapApp.addMessage('assistant', '');
    welcomeText.innerHTML = await marked.parse(
      '🛰️ **卫星-链路已就绪**\n\n我是你的 AI 地图向导。你可以：\n- 输入任何地名查看 3D 实景\n- 询问两地之间的路线\n- 探索世界各地有趣的地点\n\n试试输入框中的示例提示词开始吧！',
    );
  } catch (error) {
    console.error('[Satellite] 初始化失败:', error);
    const { textElement } = mapApp.addMessage('error', '');
    textElement.innerHTML = await marked.parse(
      `⚠️ **卫星-链路初始化失败**\n\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
