const STORAGE_KEY = 'novel-ai-config';

const DEFAULT_CONFIG = {
  provider: 'openai_compatible',
  endpoint: '',
  model: '',
  apiKey: '',
};

export function getApiConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export function saveApiConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
