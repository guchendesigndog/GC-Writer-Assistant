function withTimeoutFetch(url, options, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function normalizeLlmConfig(config) {
  const rawEndpoint = String(config?.endpoint || '').trim();
  const endpointLower = rawEndpoint.toLowerCase();

  if (endpointLower.includes('dashscope.aliyuncs.com/apps/')) {
    return {
      provider: 'dashscope',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: config?.model || '',
      apiKey: config?.apiKey || '',
    };
  }

  if (endpointLower.includes('dashscope.aliyuncs.com')) {
    return {
      provider: 'dashscope',
      endpoint: endpointLower.includes('/compatible-mode/') ? rawEndpoint : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: config?.model || '',
      apiKey: config?.apiKey || '',
    };
  }

  if (endpointLower.includes('anthropic.com')) {
    return {
      provider: 'anthropic',
      endpoint: rawEndpoint,
      model: config?.model || '',
      apiKey: config?.apiKey || '',
    };
  }

  return {
    provider: config?.provider || 'openai_compatible',
    endpoint: rawEndpoint,
    model: config?.model || '',
    apiKey: config?.apiKey || '',
  };
}

async function callOpenAICompatible(endpoint, model, apiKey, messages) {
  if (!endpoint) return { ok: false, content: '', error: '缺少端点地址' };
  try {
    const res = await withTimeoutFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, content: '', error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { ok: true, content: data?.choices?.[0]?.message?.content || '', error: '' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, content: '', error: '请求超时，请检查端点地址或网络连接' };
    return { ok: false, content: '', error: error?.message || '请求失败' };
  }
}

async function callAnthropic(apiKey, model, messages) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  try {
    const res = await withTimeoutFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemMsg?.content || '',
        messages: userMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, content: '', error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { ok: true, content: data?.content?.[0]?.text || '', error: '' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, content: '', error: '请求超时，请检查网络连接' };
    return { ok: false, content: '', error: error?.message || '请求失败' };
  }
}

async function callDashScope(endpoint, apiKey, model, messages) {
  try {
    const res = await withTimeoutFetch(endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, content: '', error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { ok: true, content: data?.choices?.[0]?.message?.content || '', error: '' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, content: '', error: '请求超时，请检查端点地址或网络连接' };
    return { ok: false, content: '', error: error?.message || '请求失败' };
  }
}

export async function callLLM(config, messages) {
  const { provider, endpoint, model, apiKey } = normalizeLlmConfig(config);
  switch (provider) {
    case 'openai_compatible':
      return callOpenAICompatible(endpoint, model, apiKey, messages);
    case 'anthropic':
      return callAnthropic(apiKey, model, messages);
    case 'dashscope':
      return callDashScope(endpoint, apiKey, model, messages);
    default:
      return { ok: false, content: '', error: 'Unknown provider: ' + provider };
  }
}


