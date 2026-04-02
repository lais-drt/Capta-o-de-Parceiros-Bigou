const PIPEDRIVE_BASE = 'https://api.pipedrive.com/v1';

export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function pipedriveUrl(path, token) {
  const sep = path.includes('?') ? '&' : '?';
  return `${PIPEDRIVE_BASE}${path}${sep}api_token=${encodeURIComponent(token)}`;
}

async function pipedriveRequest(method, path, token, body) {
  const headers = { Accept: 'application/json' };
  const init = { method, headers };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(pipedriveUrl(path, token), init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg =
      json.error ||
      json.error_info ||
      json.errorMessage ||
      `Pipedrive HTTP ${res.status}`;
    const err = new Error(msg);
    err.details = json;
    throw err;
  }
  return json.data;
}

function normalizeForCompare(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** undefined = ainda nao consultado API; null = nao achou */
let resolvedDealLabelIdFromApi;

async function resolveDealLabelId(token) {
  const fromEnv = process.env.DEAL_LABEL_ID;
  if (fromEnv !== undefined && String(fromEnv).trim() !== '') {
    const n = Number(fromEnv);
    if (!Number.isNaN(n)) return n;
  }

  if (resolvedDealLabelIdFromApi !== undefined) {
    return resolvedDealLabelIdFromApi;
  }

  const labelName = (process.env.DEAL_LABEL_NAME || 'Solicitação').trim();

  try {
    const fields = await pipedriveRequest('GET', '/dealFields', token);
    const labelField = Array.isArray(fields)
      ? fields.find((f) => f.key === 'label')
      : null;
    if (!labelField?.options?.length) {
      resolvedDealLabelIdFromApi = null;
      return null;
    }
    const target = normalizeForCompare(labelName);
    const match = labelField.options.find(
      (o) => normalizeForCompare(o.label) === target
    );
    resolvedDealLabelIdFromApi =
      match != null && match.id != null ? Number(match.id) : null;
    if (resolvedDealLabelIdFromApi === null) {
      console.warn(
        `Pipedrive: etiqueta "${labelName}" nao encontrada em dealFields (key=label)`
      );
    }
  } catch (e) {
    console.error('Pipedrive dealFields:', e.message);
    resolvedDealLabelIdFromApi = null;
  }

  return resolvedDealLabelIdFromApi;
}

function discordField(name, value, inline = true) {
  const v = String(value ?? '').trim() || '—';
  return { name, value: v.slice(0, 1024), inline };
}

/**
 * Notificação opcional no Discord. Falhas são apenas logadas (não quebram o lead).
 */
async function notifyDiscordLead(webhookUrl, d, pipedriveIds) {
  const url = String(webhookUrl || '').trim();
  if (!url) return;

  const { dealId, personId, orgId } = pipedriveIds;

  const embed = {
    title: 'Novo lead — Captação Parceiros Bigou',
    description: `**${String(d.restaurantName || '').trim()}** enviou cadastro de parceiro.`,
    color: 0x26b573,
    fields: [
      discordField('Proprietário', d.ownerName),
      discordField('WhatsApp', d.ownerPhone),
      discordField('Cidade / UF', `${d.ownerCity} — ${d.ownerState}`),
      discordField('Ramo', d.restaurantCategory),
      discordField('Faz entrega', d.doesDelivery || 'Não informado'),
      discordField('Melhor horário p/ contato', d.bestContactTime || 'Não informado'),
      discordField('Pipedrive — Deal', dealId != null ? `#${dealId}` : '—'),
      discordField('Pipedrive — Pessoa', personId != null ? `#${personId}` : '—'),
      discordField('Pipedrive — Org.', orgId != null ? `#${orgId}` : '—'),
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Bigou — Leads',
        embeds: [embed],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Discord webhook:', res.status, text.slice(0, 300));
    }
  } catch (e) {
    console.error('Discord webhook:', e.message);
  }
}

function buildNote(d) {
  const lines = [
    '**Dados do proprietário**',
    `Nome: ${d.ownerName || ''}`,
    `Celular (WhatsApp): ${d.ownerPhone || ''}`,
    `Cidade / UF: ${d.ownerCity || ''} — ${d.ownerState || ''}`,
    '',
    '**Restaurante**',
    `Nome: ${d.restaurantName || ''}`,
    `Ramo: ${d.restaurantCategory || ''}`,
    '',
    '**Operação**',
    `Faz entrega: ${d.doesDelivery || 'Não informado'}`,
    `Melhor horário para contato: ${d.bestContactTime || 'Não informado'}`,
  ];
  return lines.join('\n');
}

const REQUIRED = [
  'ownerName',
  'ownerPhone',
  'ownerState',
  'ownerCity',
  'restaurantName',
  'restaurantCategory',
];

/**
 * Handler compartilhado: Netlify Function e servidor de dev do Vite.
 * @param {{ httpMethod: string, body: string }} event
 * @returns {Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
export async function handleLeadRequest(event) {
  const httpMethod = event.httpMethod || 'GET';

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const token = process.env.PIPEDRIVE_TOKEN;
  const pipelineId = Number(process.env.PIPELINE_ID || '1');
  const stageId = Number(process.env.STAGE_ID || '1');
  const dealTitlePrefix = process.env.DEAL_TITLE_PREFIX || 'Lead Parceiro Bigou';

  if (!token) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error:
          'Servidor sem PIPEDRIVE_TOKEN. Crie um arquivo .env na raiz (veja .env-example) e reinicie o dev.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'JSON inválido' }),
    };
  }

  const d = payload.data && typeof payload.data === 'object' ? payload.data : payload;

  const missing = REQUIRED.filter((key) => !String(d[key] ?? '').trim());
  if (missing.length) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Campos obrigatórios ausentes', fields: missing }),
    };
  }

  const ownerPhoneDigits = digitsOnly(d.ownerPhone);
  if (ownerPhoneDigits.length < 10) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Celular do proprietário inválido' }),
    };
  }

  try {
    const cityStateAddress = `${String(d.ownerCity).trim()} - ${String(
      d.ownerState
    ).trim()}`;

    const org = await pipedriveRequest('POST', '/organizations', token, {
      name: String(d.restaurantName).trim(),
      address: cityStateAddress,
    });

    const person = await pipedriveRequest('POST', '/persons', token, {
      name: String(d.ownerName).trim(),
      org_id: org.id,
      phone: [{ value: ownerPhoneDigits, primary: true }],
    });

    const labelId = await resolveDealLabelId(token);
    const dealPayload = {
      title: `${dealTitlePrefix}: ${String(d.restaurantName).trim()}`,
      person_id: person.id,
      org_id: org.id,
      pipeline_id: pipelineId,
      stage_id: stageId,
    };
    if (labelId != null && !Number.isNaN(labelId)) {
      dealPayload.label = labelId;
    }

    const deal = await pipedriveRequest('POST', '/deals', token, dealPayload);

    await pipedriveRequest('POST', '/notes', token, {
      content: buildNote(d),
      deal_id: deal.id,
    });

    await notifyDiscordLead(process.env.DISCORD_WEBHOOK_URL, d, {
      dealId: deal.id,
      personId: person.id,
      orgId: org.id,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        dealId: deal.id,
        personId: person.id,
        orgId: org.id,
      }),
    };
  } catch (e) {
    console.error('Pipedrive lead error:', e.message, e.details || '');
    const errBody = {
      error: 'Não foi possível registrar no Pipedrive. Tente novamente mais tarde.',
    };
    if (process.env.LEAD_DEBUG === '1') {
      errBody.detail = e.message;
      if (e.details) errBody.pipedrive = e.details;
    }
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify(errBody),
    };
  }
}
