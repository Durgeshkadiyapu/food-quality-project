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

export async function generateFoodAdvice(input = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw AppError.mlServiceUnavailable('AI Advisor is not configured. Add GROQ_API_KEY to backend environment variables.');
  const fruit = Object.hasOwn(STORAGE, input.fruit_type) ? input.fruit_type : 'Apple';
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const context = {
    fruit_type: fruit,
    predicted_class: ['Fresh', 'Semi-Fresh', 'Spoiled'].includes(input.predicted_class) ? input.predicted_class : 'Unknown',
    sensor_readings: input.sensor_readings || {},
    shap_contributions: Array.isArray(input.shap_contributions) ? input.shap_contributions.slice(0, 10) : [],
    storage_reference: STORAGE[fruit],
    label_method: input.label_method || 'storage_day_proxy'
  };
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 800, response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Give cautious food-storage education. SHAP is not causal proof. Never declare food safe or unsafe solely from this model, do not invent exact temperature targets, and use only the supplied storage reference. Labels are experimental proxy/synthetic labels, not laboratory truth. Return JSON keys summary, what_model_saw, recommended_actions, storage_guidance, monitor_next, limitations. summary is a string; all other values are arrays of up to 4 short strings.' },
          { role: 'user', content: JSON.stringify(context) }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw AppError.mlServiceUnavailable('Groq AI Advisor is temporarily unreachable. Please retry.');
  }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw AppError.mlServiceUnavailable('Groq credentials rejected; check GROQ_API_KEY.');
    if (response.status === 429) throw AppError.mlServiceUnavailable('Groq rate limit reached. Please retry shortly.');
    throw AppError.mlServiceUnavailable('Groq could not generate advice right now.');
  }
  let envelope;
  try { envelope = await response.json(); } catch { throw AppError.mlUpstreamError('Groq returned invalid JSON.'); }
  let advice;
  try { advice = JSON.parse(envelope.choices[0].message.content); } catch { throw AppError.mlUpstreamError('Groq returned malformed advice.'); }
  const lists = ['what_model_saw', 'recommended_actions', 'storage_guidance', 'monitor_next', 'limitations'];
  if (typeof advice.summary !== 'string' || lists.some(k => !Array.isArray(advice[k]))) throw AppError.mlUpstreamError('Groq response schema was invalid.');
  return {
    summary: advice.summary.slice(0, 1200),
    ...Object.fromEntries(lists.map(k => [k, advice[k].slice(0, 4).map(v => String(v).slice(0, 300))])),
    provider: 'Groq', model, evidence: [{ title: 'Produce storage reference', detail: STORAGE[fruit] }],
    disclaimer: 'Experimental model output and AI advice are informational only; they do not establish food safety or guarantee shelf life.'
  };
}
