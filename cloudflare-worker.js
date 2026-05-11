// OneCallShield — Cloudflare Worker (Email + KV handler)
// Deploy via: wrangler deploy
// Env vars needed: RESEND_API_KEY, FIREBASE_SECRET (optional, for server-side reads)

const FIREBASE_DB = 'https://onecallshield-default-rtdb.firebaseio.com';
const FROM_EMAIL = 'OneCallShield <no-reply@onecallshield.com>';
const ADMIN_EMAIL = 'chris.santoro55@gmail.com';
const PORTAL_URL = 'https://onecallshield.com/portal.html';
const SITE_URL = 'https://onecallshield.com';

const LEAD_FEES = {
  'Auto Insurance': 150,
  'Homeowners Insurance': 200,
  'Life Insurance': 200,
  'Medicare': 200,
  'Health Insurance': 175,
  'Renters Insurance': 75,
  'Other': 100
};

// ─── CORS HEADERS ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    let body;
    try { body = await request.json(); }
    catch { return new Response('Bad JSON', { status: 400, headers: CORS }); }

    try {
      const result = await handleType(body, env);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS }
      });
    }
  }
};

// ─── ROUTER ───────────────────────────────────────────────────────────────────
async function handleType(body, env) {
  switch (body.type) {

    // ── Existing types ──────────────────────────────────────────────────────

    case 'new_lead':
      return handleNewLead(body, env);

    case 'agent_application':
      return handleAgentApplication(body, env);

    case 'portal_access':
      return handlePortalAccess(body, env);

    case 'agent_lead':
      return handleAgentLead(body, env);

    case 'consumer_matched':
      return handleConsumerMatched(body, env);

    case 'update_agent_password':
      return handleUpdatePassword(body, env);

    case 'save_agent':
      return handleSaveAgent(body, env);

    // ── Quote marketplace types ─────────────────────────────────────────────

    case 'quote_request_agents':
      return handleQuoteRequestAgents(body, env);

    case 'quote_submitted':
      return handleQuoteSubmitted(body, env);

    case 'quotes_ready_consumer':
      return handleQuotesReadyConsumer(body, env);

    case 'quote_selected_agent':
      return handleQuoteSelectedAgent(body, env);

    case 'quote_selected_consumer':
      return handleQuoteSelectedConsumer(body, env);

    default:
      return { skipped: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleNewLead(body, env) {
  const { lead } = body;
  await sendEmail(env, {
    to: ADMIN_EMAIL,
    subject: `🎯 New Lead — ${lead.insuranceType} · ${lead.zip}`,
    html: adminNewLeadEmail(lead)
  });
  return { sent: 'admin' };
}

async function handleAgentApplication(body, env) {
  await sendEmail(env, {
    to: ADMIN_EMAIL,
    subject: `👥 New Agent Application — ${body.firstName} ${body.lastName}`,
    html: agentApplicationEmail(body)
  });
  return { sent: 'admin' };
}

async function handlePortalAccess(body, env) {
  await sendEmail(env, {
    to: body.agentEmail,
    subject: `🔑 Your OneCallShield Portal Access — ${body.agentFirstName}`,
    html: portalAccessEmail(body)
  });
  return { sent: body.agentEmail };
}

async function handleAgentLead(body, env) {
  await sendEmail(env, {
    to: body.agentEmail,
    subject: `🎯 New Lead Assigned — ${body.insuranceType}`,
    html: agentLeadEmail(body)
  });
  return { sent: body.agentEmail };
}

async function handleConsumerMatched(body, env) {
  if (!body.consumerEmail) return { skipped: 'no email' };
  await sendEmail(env, {
    to: body.consumerEmail,
    subject: `✅ Your Insurance Agent Will Call Soon`,
    html: consumerMatchedEmail(body)
  });
  return { sent: body.consumerEmail };
}

async function handleUpdatePassword(body, env) {
  await sendEmail(env, {
    to: body.agentEmail,
    subject: `🔑 Your OneCallShield Password Was Updated`,
    html: passwordUpdatedEmail(body)
  });
  return { sent: body.agentEmail };
}

async function handleSaveAgent(body, env) {
  if (env.OCS_KV) {
    await env.OCS_KV.put('agent_' + body.agent.id, JSON.stringify(body.agent));
  }
  return { saved: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE MARKETPLACE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// Triggered when a new quote_requested lead comes in.
// Fetches all approved agents matching the insurance type and emails each one.
async function handleQuoteRequestAgents(body, env) {
  const { lead } = body;
  if (!lead) throw new Error('Missing lead');

  // Fetch agents from Firebase REST API (public read assumed)
  const fbRes = await fetch(`${FIREBASE_DB}/agents.json`);
  if (!fbRes.ok) throw new Error('Firebase fetch failed');
  const agentsData = await fbRes.json();
  if (!agentsData) return { sent: 0 };

  const agents = Object.values(agentsData);
  const matching = agents.filter(a =>
    a.status === 'approved' &&
    a.email &&
    (a.insuranceTypes || []).some(t =>
      t.toLowerCase().includes(lead.insuranceType?.toLowerCase?.() || '') ||
      lead.insuranceType?.toLowerCase?.().includes(t.toLowerCase())
    )
  );

  const fee = LEAD_FEES[lead.insuranceType] || 100;
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const sends = matching.map(agent =>
    sendEmail(env, {
      to: agent.email,
      subject: `🔔 Quote Opportunity — ${lead.insuranceType} · ${lead.zip} · $${fee} lead`,
      html: quoteRequestAgentEmail({ lead, agent, fee, deadline })
    })
  );
  await Promise.allSettled(sends);

  return { sent: matching.length, agents: matching.map(a => a.email) };
}

// Triggered when an agent submits a quote — confirms receipt to the agent.
async function handleQuoteSubmitted(body, env) {
  const { agentEmail, agentName, leadId, insuranceType, rate, carrier } = body;
  if (!agentEmail) return { skipped: 'no email' };
  await sendEmail(env, {
    to: agentEmail,
    subject: `✅ Quote Submitted — ${insuranceType}`,
    html: quoteSubmittedEmail({ agentName, leadId, insuranceType, rate, carrier })
  });
  return { sent: agentEmail };
}

// Triggered when enough quotes are in (dispatch conditions met).
// Emails consumer with all quotes as cards — each has a "Select" link.
async function handleQuotesReadyConsumer(body, env) {
  const { lead, quotes } = body;
  if (!lead?.email) return { skipped: 'no consumer email' };
  if (!quotes || !quotes.length) return { skipped: 'no quotes' };

  await sendEmail(env, {
    to: lead.email,
    subject: `🎉 Your ${lead.insuranceType} Quotes Are Ready — Pick Your Agent`,
    html: quotesReadyConsumerEmail({ lead, quotes })
  });
  return { sent: lead.email };
}

// Sent to the winning agent after consumer selects their quote.
async function handleQuoteSelectedAgent(body, env) {
  const { agent, lead, quote } = body;
  if (!agent?.email) return { skipped: 'no agent email' };
  const fee = LEAD_FEES[lead.insuranceType] || 100;
  await sendEmail(env, {
    to: agent.email,
    subject: `🏆 Lead Won — ${lead.insuranceType} · ${lead.firstName} ${lead.lastName}`,
    html: quoteSelectedAgentEmail({ agent, lead, quote, fee })
  });
  return { sent: agent.email };
}

// Sent to the consumer confirming their agent selection.
async function handleQuoteSelectedConsumer(body, env) {
  const { agent, lead } = body;
  if (!lead?.email) return { skipped: 'no consumer email' };
  await sendEmail(env, {
    to: lead.email,
    subject: `✅ You've Chosen Your Agent — ${agent.firstName} ${agent.lastName} Will Be in Touch`,
    html: quoteSelectedConsumerEmail({ agent, lead })
  });
  return { sent: lead.email };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SENDER (Resend API)
// ═══════════════════════════════════════════════════════════════════════════════
async function sendEmail(env, { to, subject, html }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email skipped:', subject);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const emailBase = (content) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f0ebe3;font-family:'DM Sans',Arial,sans-serif;}
  .wrap{max-width:600px;margin:0 auto;padding:32px 16px;}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.1);}
  .header{background:linear-gradient(135deg,#0d1f3c,#1a3460);padding:32px;text-align:center;}
  .logo{font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:-0.01em;}
  .logo span{color:#c9973a;}
  .body{padding:32px;}
  h1{font-size:1.4rem;color:#0d1f3c;margin:0 0 8px;font-weight:700;}
  p{color:#5a6480;font-size:0.95rem;line-height:1.6;margin:0 0 16px;}
  .highlight{background:#f8f4ee;border-radius:12px;padding:16px 20px;margin:16px 0;}
  .highlight-label{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.07em;color:#5a6480;font-weight:700;margin-bottom:4px;}
  .highlight-value{font-size:1rem;color:#0d1f3c;font-weight:700;}
  .btn{display:inline-block;background:#c9973a;color:#0d1f3c;padding:14px 28px;border-radius:12px;font-weight:700;font-size:0.95rem;text-decoration:none;margin:8px 0;}
  .btn-navy{background:#0d1f3c;color:#fff;}
  .row{display:flex;gap:12px;flex-wrap:wrap;}
  .pill{flex:1;min-width:120px;background:#f8f4ee;border-radius:10px;padding:12px 14px;}
  .pill-label{font-size:0.68rem;color:#5a6480;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;font-weight:700;}
  .pill-value{font-size:0.92rem;color:#0d1f3c;font-weight:700;}
  .footer{background:#f8f4ee;padding:20px 32px;text-align:center;font-size:0.78rem;color:#5a6480;border-top:1px solid rgba(13,31,60,0.06);}
  .divider{height:1px;background:rgba(13,31,60,0.07);margin:20px 0;}
  .quote-card{background:#f8f4ee;border:1px solid rgba(13,31,60,0.08);border-radius:14px;padding:20px;margin-bottom:12px;}
  .quote-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .quote-agent{font-weight:700;color:#0d1f3c;font-size:1rem;}
  .quote-rate{font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#c9973a;}
  .quote-carrier{font-size:0.82rem;color:#5a6480;margin-top:2px;}
  .quote-point{font-size:0.85rem;color:#0d1f3c;background:#fff;border-radius:8px;padding:8px 12px;margin:8px 0;}
  .select-btn{display:block;text-align:center;background:#0d1f3c;color:#fff;padding:12px;border-radius:10px;font-weight:700;font-size:0.9rem;text-decoration:none;margin-top:10px;}
  .select-btn:hover{background:#1a3460;}
  .alert{background:linear-gradient(135deg,#0d1f3c,#1a3460);border:1px solid rgba(201,151,58,0.3);border-radius:12px;padding:16px 20px;margin:16px 0;}
  .alert p{color:rgba(255,255,255,0.75);margin:0;}
  .alert strong{color:#c9973a;}
</style></head>
<body><div class="wrap"><div class="card">
<div class="header">
  <div class="logo">OneCall<span>Shield</span></div>
  <div style="color:rgba(255,255,255,0.5);font-size:0.78rem;margin-top:4px;">Insurance Done Right</div>
</div>
<div class="body">${content}</div>
<div class="footer">OneCallShield.com · <a href="${SITE_URL}" style="color:#c9973a;">Visit Site</a><br>Questions? <a href="mailto:info@onecallshield.com" style="color:#c9973a;">info@onecallshield.com</a></div>
</div></div></body></html>`;

// ── Admin: new lead ─────────────────────────────────────────────────────────
function adminNewLeadEmail(lead) {
  return emailBase(`
    <h1>🎯 New Lead Submitted</h1>
    <p>A consumer just requested an insurance quote. Log in to match them to an agent.</p>
    <div class="row">
      <div class="pill"><div class="pill-label">Name</div><div class="pill-value">${lead.firstName} ${lead.lastName}</div></div>
      <div class="pill"><div class="pill-label">Insurance</div><div class="pill-value">${lead.insuranceType}</div></div>
    </div>
    <div class="row">
      <div class="pill"><div class="pill-label">ZIP</div><div class="pill-value">${lead.zip}</div></div>
      <div class="pill"><div class="pill-label">Age</div><div class="pill-value">${lead.age || '—'}</div></div>
    </div>
    ${lead.phone ? `<div class="highlight"><div class="highlight-label">Phone</div><div class="highlight-value">${lead.phone}</div></div>` : ''}
    <a href="https://onecallshield.com/admin.html" class="btn">Go to Admin →</a>
  `);
}

// ── Admin: agent application ────────────────────────────────────────────────
function agentApplicationEmail(body) {
  return emailBase(`
    <h1>👥 New Agent Application</h1>
    <p>${body.firstName} ${body.lastName} applied to join the OneCallShield agent network.</p>
    <div class="row">
      <div class="pill"><div class="pill-label">Name</div><div class="pill-value">${body.firstName} ${body.lastName}</div></div>
      <div class="pill"><div class="pill-label">Agency</div><div class="pill-value">${body.agency || '—'}</div></div>
    </div>
    <div class="highlight"><div class="highlight-label">Email</div><div class="highlight-value">${body.email}</div></div>
    <a href="https://onecallshield.com/admin.html" class="btn">Review Application →</a>
  `);
}

// ── Agent: portal access credentials ───────────────────────────────────────
function portalAccessEmail(body) {
  return emailBase(`
    <h1>🔑 Your Portal Is Ready, ${body.agentFirstName}!</h1>
    <p>Your application has been approved. Here are your login credentials for the OneCallShield agent portal.</p>
    <div class="highlight">
      <div style="margin-bottom:12px;"><div class="highlight-label">Email</div><div class="highlight-value">${body.agentEmail}</div></div>
      <div><div class="highlight-label">Password</div><div class="highlight-value" style="font-family:monospace;letter-spacing:0.05em;">${body.password}</div></div>
    </div>
    <p style="font-size:0.85rem;">You can change your password after logging in. Keep these credentials secure.</p>
    <a href="${PORTAL_URL}" class="btn">Log In to Portal →</a>
  `);
}

// ── Agent: lead assigned ────────────────────────────────────────────────────
function agentLeadEmail(body) {
  return emailBase(`
    <h1>🎯 New Lead Assigned to You</h1>
    <p>You've been matched to a consumer looking for <strong>${body.insuranceType}</strong> coverage. Contact them as soon as possible — speed matters!</p>
    <div class="row">
      <div class="pill"><div class="pill-label">Consumer</div><div class="pill-value">${body.consumerName || 'See Portal'}</div></div>
      <div class="pill"><div class="pill-label">Insurance</div><div class="pill-value">${body.insuranceType}</div></div>
    </div>
    ${body.phone ? `<div class="highlight"><div class="highlight-label">📞 Phone</div><div class="highlight-value" style="font-size:1.2rem;">${body.phone}</div></div>` : ''}
    <div class="alert"><p><strong>⚡ Pro tip:</strong> Consumers who hear back within 5 minutes are 9x more likely to convert. Call now!</p></div>
    <a href="${PORTAL_URL}" class="btn">View in Portal →</a>
  `);
}

// ── Consumer: matched email ─────────────────────────────────────────────────
function consumerMatchedEmail(body) {
  return emailBase(`
    <h1>✅ Great News — Your Agent Is On the Way!</h1>
    <p>We've matched you with a licensed insurance specialist for your <strong>${body.insuranceType || 'insurance'}</strong> request. They'll be calling you shortly.</p>
    <div class="highlight">
      <div class="highlight-label">What to expect</div>
      <div class="highlight-value">A licensed agent will call you within the next few hours</div>
    </div>
    <p>They'll review your information, answer any questions, and help you find the best policy for your needs — at no cost to you.</p>
    <div class="alert"><p><strong>🛡️ Your number is protected.</strong> Only one matched agent has your information. We never sell to call centers.</p></div>
  `);
}

// ── Agent: password updated ─────────────────────────────────────────────────
function passwordUpdatedEmail(body) {
  return emailBase(`
    <h1>🔑 Password Updated</h1>
    <p>Hi ${body.agentName || 'Agent'}, your OneCallShield portal password has been changed successfully.</p>
    <p>If you didn't make this change, contact us immediately at <a href="mailto:info@onecallshield.com" style="color:#c9973a;">info@onecallshield.com</a>.</p>
    <a href="${PORTAL_URL}" class="btn">Log In →</a>
  `);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTE MARKETPLACE EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Agent: quote opportunity (no consumer contact info) ─────────────────────
function quoteRequestAgentEmail({ lead, agent, fee, deadline }) {
  const details = lead.insuranceDetails || {};
  const detailRows = Object.entries(details).filter(([,v]) => v).map(([k,v]) =>
    `<div class="pill"><div class="pill-label">${k}</div><div class="pill-value">${v}</div></div>`
  ).join('');

  return emailBase(`
    <h1>🔔 New Quote Opportunity</h1>
    <p>Hi ${agent.firstName}, a consumer is requesting quotes for <strong>${lead.insuranceType}</strong>. Submit your best rate in the next 2 hours to compete for this lead.</p>

    <div class="alert">
      <p><strong>⏰ Deadline: ${deadline}</strong> — quotes close in 2 hours. First come, best chance.</p>
    </div>

    <div class="divider"></div>
    <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#5a6480;margin-bottom:8px;">Consumer Profile</p>

    <div class="row">
      <div class="pill"><div class="pill-label">Insurance Type</div><div class="pill-value">${lead.insuranceType}</div></div>
      <div class="pill"><div class="pill-label">Age</div><div class="pill-value">${lead.age || '—'}</div></div>
    </div>
    <div class="row">
      <div class="pill"><div class="pill-label">ZIP Code</div><div class="pill-value">${lead.zip}</div></div>
      <div class="pill"><div class="pill-label">Coverage Level</div><div class="pill-value">${lead.coverageLevel || '—'}</div></div>
    </div>
    ${detailRows ? `<div class="row">${detailRows}</div>` : ''}

    <div class="divider"></div>
    <div class="highlight">
      <div class="highlight-label">Lead Fee (if selected)</div>
      <div class="highlight-value" style="color:#c9973a;font-size:1.3rem;">$${fee}</div>
    </div>

    <p>If the consumer chooses your quote, you'll receive their full contact information and be charged the lead fee. No contact info is shared until selection.</p>

    <a href="${PORTAL_URL}?tab=requests" class="btn">Submit Your Quote →</a>

    <p style="font-size:0.8rem;color:#5a6480;margin-top:16px;">Log in to your portal and find this lead in the <strong>🔔 Quote Requests</strong> tab. Quote deadline: <strong>${deadline}</strong>.</p>
  `);
}

// ── Agent: quote submission confirmation ────────────────────────────────────
function quoteSubmittedEmail({ agentName, leadId, insuranceType, rate, carrier }) {
  return emailBase(`
    <h1>✅ Quote Submitted Successfully</h1>
    <p>Hi ${agentName || 'Agent'}, your quote for the <strong>${insuranceType}</strong> lead has been submitted and is now under review.</p>
    <div class="row">
      <div class="pill"><div class="pill-label">Your Rate</div><div class="pill-value">${rate}</div></div>
      <div class="pill"><div class="pill-label">Carrier</div><div class="pill-value">${carrier}</div></div>
    </div>
    <div class="highlight">
      <div class="highlight-label">What happens next</div>
      <div class="highlight-value">We'll collect quotes from other agents, then send the consumer all options to choose from</div>
    </div>
    <p>If the consumer selects your quote, you'll be notified immediately with their full contact information.</p>
    <div class="alert"><p><strong>💡 Tip:</strong> Competitive rates and strong selling points win more leads. You can view your submission status in the portal.</p></div>
    <a href="${PORTAL_URL}" class="btn btn-navy">View Portal →</a>
  `);
}

// ── Consumer: quotes ready (all quotes as cards) ────────────────────────────
function quotesReadyConsumerEmail({ lead, quotes }) {
  const quoteCards = quotes.map((q, i) => {
    const selectUrl = `${SITE_URL}/select-quote.html?lead=${lead.id}&quote=${q.agentId}`;
    return `
    <div class="quote-card">
      <div class="quote-card-header">
        <div>
          <div class="quote-agent">${q.agentName || 'Licensed Agent'}</div>
          <div class="quote-carrier">${q.carrier} · ${q.agentAgency || 'Independent'}</div>
        </div>
        <div style="text-align:right;">
          <div class="quote-rate">${q.rate}</div>
          <div style="font-size:0.72rem;color:#5a6480;">per month</div>
        </div>
      </div>
      ${q.sellingPoint ? `<div class="quote-point">💬 "${q.sellingPoint}"</div>` : ''}
      <a href="${selectUrl}" class="select-btn">Select This Quote →</a>
    </div>`;
  }).join('');

  return emailBase(`
    <h1>🎉 Your ${lead.insuranceType} Quotes Are Ready!</h1>
    <p>Hi ${lead.firstName}, we collected quotes from ${quotes.length} licensed agent${quotes.length !== 1 ? 's' : ''} for your <strong>${lead.insuranceType}</strong> coverage. Review and select the one that's right for you.</p>

    <div class="alert">
      <p><strong>🛡️ How this works:</strong> Once you select a quote, only that agent receives your contact information. No spam, no call centers.</p>
    </div>

    <div class="divider"></div>
    <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#5a6480;margin-bottom:12px;">Your Quotes — Choose One</p>

    ${quoteCards}

    <div class="divider"></div>
    <p style="font-size:0.83rem;color:#5a6480;">Quotes are valid for 48 hours. If you have questions, email <a href="mailto:info@onecallshield.com" style="color:#c9973a;">info@onecallshield.com</a>.</p>
  `);
}

// ── Winning agent: full consumer contact info + payment notice ──────────────
function quoteSelectedAgentEmail({ agent, lead, quote, fee }) {
  return emailBase(`
    <h1>🏆 You Won the Lead!</h1>
    <p>Hi ${agent.firstName}, ${lead.firstName} selected your quote. Here is their full contact information. Call them as soon as possible — they're expecting your call!</p>

    <div class="highlight" style="background:linear-gradient(135deg,rgba(13,31,60,0.05),rgba(201,151,58,0.08));border:1px solid rgba(201,151,58,0.3);">
      <div style="margin-bottom:12px;"><div class="highlight-label">📞 Phone</div><div class="highlight-value" style="font-size:1.3rem;color:#0d1f3c;">${lead.phone}</div></div>
      <div style="margin-bottom:12px;"><div class="highlight-label">✉️ Email</div><div class="highlight-value">${lead.email}</div></div>
      <div><div class="highlight-label">👤 Name</div><div class="highlight-value">${lead.firstName} ${lead.lastName}</div></div>
    </div>

    <div class="row">
      <div class="pill"><div class="pill-label">Insurance Type</div><div class="pill-value">${lead.insuranceType}</div></div>
      <div class="pill"><div class="pill-label">Age</div><div class="pill-value">${lead.age || '—'}</div></div>
    </div>
    <div class="row">
      <div class="pill"><div class="pill-label">ZIP Code</div><div class="pill-value">${lead.zip}</div></div>
      <div class="pill"><div class="pill-label">Your Quoted Rate</div><div class="pill-value">${quote?.rate || '—'}</div></div>
    </div>

    <div class="divider"></div>
    <div class="alert">
      <p><strong>💳 Lead Fee: $${fee}</strong> — This will be charged to your account per your plan terms. Contact us if you have questions about billing.</p>
    </div>

    <div class="highlight">
      <div class="highlight-label">⚡ Action required</div>
      <div class="highlight-value">Call ${lead.firstName} within the next 2 hours for best results</div>
    </div>

    <a href="${PORTAL_URL}" class="btn">View Lead in Portal →</a>
  `);
}

// ── Consumer: confirmation of agent selection ───────────────────────────────
function quoteSelectedConsumerEmail({ agent, lead }) {
  return emailBase(`
    <h1>✅ Agent Confirmed — You're All Set!</h1>
    <p>Hi ${lead.firstName}, you've selected your agent. They'll be calling you shortly to finalize your <strong>${lead.insuranceType}</strong> coverage.</p>

    <div class="highlight">
      <div style="margin-bottom:8px;"><div class="highlight-label">Your Agent</div><div class="highlight-value">${agent.firstName} ${agent.lastName}</div></div>
      ${agent.agency ? `<div><div class="highlight-label">Agency</div><div class="highlight-value">${agent.agency}</div></div>` : ''}
    </div>

    <div class="alert">
      <p><strong>🛡️ Your information is protected.</strong> Only ${agent.firstName} has your contact details. We never sell your data to other agents or call centers.</p>
    </div>

    <p style="font-weight:700;color:#0d1f3c;margin-top:8px;">What to have ready when they call:</p>
    <ul style="color:#5a6480;font-size:0.9rem;line-height:1.8;padding-left:20px;margin:8px 0;">
      <li>Your current policy information (if you have one)</li>
      <li>Any questions about coverage or pricing</li>
      <li>Payment method if you'd like to get covered same day</li>
    </ul>

    <p style="font-size:0.85rem;color:#5a6480;margin-top:8px;">If you don't hear from your agent within 24 hours, contact us at <a href="mailto:info@onecallshield.com" style="color:#c9973a;">info@onecallshield.com</a> and we'll follow up immediately.</p>
  `);
}
