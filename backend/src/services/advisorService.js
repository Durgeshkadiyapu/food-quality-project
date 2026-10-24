import { AppError } from '../utils/AppError.js';

const STORAGE = {
  Apple: 'Refrigerate whole apples for longer storage; refrigerate cut fruit.',
  Banana: 'Ripen unripe bananas at room temperature; refrigeration may darken the peel.',
  Tomato: 'Ripen unripe tomatoes at room temperature; refrigerate cut tomatoes.',
  Orange: 'Store whole oranges cool or refrigerated; refrigerate cut fruit.',
  Mango: 'Ripen whole mangoes at room temperature; refrigerate ripe or cut mango.',
  Cucumber: 'Keep cucumbers cool and dry; refrigerate cut cucumber.',
  Carrot: 'Refrigerate carrots in a clean container.',
  Potato: 'Store potatoes in a cool, dark, ventilated place away from sunlight.',
  Onion: 'Store dry onions in a cool, dry, ventilated place.'
};

// Groq deprecated llama-3.3-70b-versatile for free/developer tiers on 2026-08-16.
// Keep compatibility with Render environments that still have the old value configured.
const DEPRECATED_MODEL_REPLACEMENTS = {
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b'
};

function safeProviderMessage(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\\r\\n\\t]+/g, ' ').slice(0, 240);
}

export async function generateFoodAdvice(input = {}) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw AppError.mlServiceUnavailable('AI Advisor is not configured. Add GROQ_API_KEY to backend environment variables.');
  }

  const fruit = Object.hasOwn(STORAGE, input.fruit_type) ? input.fruit_type : 'Apple';
  const configuredModel = (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();
  const model = DEPRECATED_MODEL_REPLACEMENTS[configuredModel] || configuredModel;
  if (model !== configuredModel) {
    console.warn('[Groq Advisor] Configured model is deprecated; using supported replacement.', {
      configuredModel,
      selectedModel: model
    });
  }

  const context = {
    fruit_type: fruit,
    predicted_class: ['Fresh', 'Semi-Fresh', 'Spoiled'].includes(input.predicted_class) ? input.predicted_class : 'Unknown',
    sensor_readings: input.sensor_readings && typeof input.sensor_readings === 'object' ? input.sensor_readings : {},
    shap_contributions: Array.isArray(input.shap_contributions) ? input.shap_contributions.slice(0, 10) : [],
    storage_reference: STORAGE[fruit],
    label_method: typeof input.label_method === 'string' ? input.label_method.slice(0, 100) : 'storage_day_proxy'
  };

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Give cautious food-storage education. SHAP is not causal proof. Never declare food safe or unsafe solely from this model, do not invent exact temperature targets, and use only the supplied storage reference. Labels are experimental proxy/synthetic labels, not laboratory truth. Return one valid JSON object with keys summary, what_model_saw, recommended_actions, storage_guidance, monitor_next, limitations. summary is a string; all other values are arrays of up to 4 short strings.'
          },
          { role: 'user', content: JSON.stringify(context) }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    console.error('[Groq Advisor] Request failed:', {
      name: error?.name || 'Error',
      message: safeProviderMessage(error?.message)
    });
    throw AppError.mlServiceUnavailable(
      error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'Groq took too long to respond. Please retry.'
        : 'Could not connect to Groq. Check the backend network and try again.'
    );
  }

  if (!response.ok) {
    let providerError = {};
    try {
      const body = await response.json();
      providerError = body?.error || {};
    } catch {
      // The provider may return a non-JSON error page.
    }

    console.error('[Groq Advisor] Provider rejected request:', {
      status: response.status,
      model,
      errorType: safeProviderMessage(providerError.type || providerError.code),
      message: safeProviderMessage(providerError.message)
    });

    if (response.status === 401) {
      throw AppError.mlServiceUnavailable('Groq rejected the API key (401). Check GROQ_API_KEY in the backend environment.');
    }
    if (response.status === 403) {
      throw AppError.mlServiceUnavailable('Groq denied this request (403). Check API key permissions and model access.');
    }
    if (response.status === 404) {
      throw AppError.mlServiceUnavailable(`Groq model or endpoint was not found (404). Check GROQ_MODEL; configured model: ${model}.`);
    }
    if (response.status === 429) {
      throw AppError.mlServiceUnavailable('Groq rate limit or quota reached (429). Check Groq usage and retry later.');
    }
    if (response.status === 400) {
      throw AppError.mlServiceUnavailable('Groq rejected the request (400). Check the configured model and JSON response-format support; see backend logs for details.');
    }
    throw AppError.mlServiceUnavailable(`Groq request failed with HTTP ${response.status}. See backend logs for safe diagnostic details.`);
  }

  let envelope;
  try {
    envelope = await response.json();
  } catch {
    console.error('[Groq Advisor] Successful HTTP response contained invalid JSON.');
    throw AppError.mlUpstreamError('Groq returned an invalid response.');
  }

  const content = envelope?.choices?.[0]?.message?.content;
  let advice;
  try {
    advice = JSON.parse(content);
  } catch {
    console.error('[Groq Advisor] Model response was not valid JSON.', {
      model,
      finishReason: safeProviderMessage(envelope?.choices?.[0]?.finish_reason)
    });
    throw AppError.mlUpstreamError('Groq returned malformed advice. Please retry.');
  }

  const lists = ['what_model_saw', 'recommended_actions', 'storage_guidance', 'monitor_next', 'limitations'];
  if (
    !advice ||
    typeof advice.summary !== 'string' ||
    lists.some(k => !Array.isArray(advice[k]))
  ) {
    console.error('[Groq Advisor] Model response failed schema validation.', { model });
    throw AppError.mlUpstreamError('Groq returned advice in an unexpected format. Please retry.');
  }

  return {
    summary: advice.summary.slice(0, 1200),
    ...Object.fromEntries(lists.map(k => [
      k,
      advice[k].slice(0, 4).map(v => String(v).slice(0, 300))
    ])),
    provider: 'Groq',
    model,
    evidence: [{ title: 'Produce storage reference', detail: STORAGE[fruit] }],
    disclaimer: 'Experimental model output and AI advice are informational only; they do not establish food safety or guarantee shelf life.'
  };
}
