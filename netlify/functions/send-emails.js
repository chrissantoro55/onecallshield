const RESEND_KEY = 're_9ujjXVty_GKkeGYW6SeUZqVMUJRCUfryJ';
const FROM = 'OneCallShield <noreply@onecallshield.com>';
const ADMIN_EMAIL = 'chris.santoro55@gmail.com';

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(event.body);
    const type = data.type;

    // ── TYPE 1: Admin + Consumer emails on form submit ──────────────────────
    if (type === 'new_lead') {
      const { firstName, lastName, phone, email, age, zip, insuranceType, contactTime, lifeType, faceAmount, healthStatus, leadId } = data;

      // Admin notification
      const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:20px 10px;"><tr><td align="center">
<table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0d1f3c;padding:24px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">🛡️ OneCallShield</div>
  <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Admin — New Lead Alert</div>
</td></tr>
<tr><td style="background:#c9973a;height:3px;font-size:3px;">&nbsp;</td></tr>
<tr><td style="background:#fff8ec;padding:14px 24px;text-align:center;border-bottom:1px solid rgba(201,151,58,0.2);">
  <p style="font-size:12px;font-weight:700;color:#c9973a;text-transform:uppercase;letter-spacing:2px;margin:0;">⚡ New Lead — Action Required</p>
</td></tr>
<tr><td style="padding:22px 24px;">
  <p style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#0d1f3c;margin:0 0 14px;">New ${insuranceType} Lead</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:10px;"><tr><td style="padding:14px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;width:40%;">Name</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:700;">${firstName} ${lastName}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Phone</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:15px;color:#c9973a;font-weight:700;">${phone}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Email</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:600;">${email}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Age</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:600;">${age||'N/A'}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">ZIP</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:600;">${zip}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Insurance</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:700;">${insuranceType}</td></tr>
      <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Best Time</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:600;">${contactTime||'Anytime'}</td></tr>
      ${lifeType ? `<tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Life Details</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:12px;color:#0d1f3c;">${lifeType} | ${faceAmount||'N/A'} | ${healthStatus||'N/A'}</td></tr>` : ''}
      <tr><td style="padding:7px 0;font-size:12px;color:#8a94b0;">Lead ID</td><td style="padding:7px 0;font-size:11px;color:#0d1f3c;font-family:monospace;">${leadId}</td></tr>
    </table>
  </td></tr></table>
  <div style="text-align:center;margin-top:18px;">
    <a href="https://onecallshield.com/admin" style="display:inline-block;background:#c9973a;color:#0d1f3c;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:10px;">Open Admin Dashboard →</a>
  </div>
  <div style="margin-top:14px;background:#e8f5ee;border-radius:8px;border-left:3px solid #2d7a4f;padding:10px 14px;">
    <p style="font-size:11px;color:#2d7a4f;font-weight:700;margin:0 0 2px;">✅ TCPA Compliant</p>
    <p style="font-size:11px;color:#5a6480;margin:0;">Consumer provided express written consent at time of submission.</p>
  </div>
</td></tr>
<tr><td style="background:#f8f4ee;padding:14px 24px;text-align:center;border-top:1px solid #e4e8f0;">
  <p style="font-size:11px;color:#8a94b0;margin:0;">🛡️ OneCallShield Admin · <a href="https://onecallshield.com/admin" style="color:#c9973a;text-decoration:none;">onecallshield.com/admin</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

      // Consumer welcome email
      const consumerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body,table,td,div,p{margin:0;padding:0;}body{-webkit-text-size-adjust:100%;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;}table{border-collapse:collapse;}
@media only screen and (max-width:600px){.ec{width:100%!important;}.pad{padding:22px 16px!important;}.padsm{padding:0 14px 20px!important;}.ht{font-size:22px!important;}.gc{padding:0 7px!important;}.gn{font-size:22px!important;}}</style></head>
<body style="margin:0;padding:0;background:#f0f4f8;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f0f4f8;">You're all set! One agent. One call. Zero spam.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;"><tr><td align="center" style="padding:20px 10px;">
<table class="ec" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#0d1f3c;padding:28px 24px 22px;">
  <div style="background:#c9973a;border-radius:50%;width:50px;height:50px;line-height:50px;text-align:center;font-size:22px;margin:0 auto 10px;">🛡️</div>
  <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">OneCallShield</div>
  <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">The One Call Guarantee™</div>
</td></tr>
<tr><td style="background:#c9973a;height:3px;font-size:3px;">&nbsp;</td></tr>
<tr><td class="pad" align="center" style="padding:32px 28px 24px;">
  <p class="ht" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#0d1f3c;line-height:1.25;margin:0 0 10px;">You're in good hands,<br>${firstName}. 🙌</p>
  <p style="font-size:14px;color:#5a6480;line-height:1.75;margin:0;">We've received your request and our team is <strong style="color:#0d1f3c;">personally reviewing it right now.</strong> No surprises, no spam, no stress.</p>
</td></tr>
<tr><td class="padsm" style="padding:0 22px 22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;">
    <tr><td style="padding:14px 16px 2px;"><p style="font-size:10px;font-weight:700;color:#8a94b0;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">📋 Your Request Summary</p></td></tr>
    <tr><td style="padding:0 16px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;width:46%;">Insurance Type</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:700;">${insuranceType}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">ZIP Code</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:700;">${zip}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#8a94b0;">Preferred Call Time</td><td style="padding:7px 0;border-bottom:1px solid rgba(13,31,60,0.08);font-size:13px;color:#0d1f3c;font-weight:700;">${contactTime||'Anytime'}</td></tr>
        <tr><td style="padding:7px 0;font-size:12px;color:#8a94b0;">Request ID</td><td style="padding:7px 0;font-size:11px;color:#0d1f3c;font-weight:600;font-family:monospace;word-break:break-all;">${leadId}</td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
<tr><td class="padsm" style="padding:0 22px 22px;">
  <p style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#0d1f3c;margin:0 0 14px;">What happens next</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
    <td style="width:34px;vertical-align:top;"><div style="background:#0d1f3c;color:#c9973a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:12px;font-family:Georgia,serif;">1</div></td>
    <td style="vertical-align:top;padding-left:10px;"><p style="font-size:13px;font-weight:700;color:#0d1f3c;margin:0 0 3px;">We personally select your agent</p><p style="font-size:12px;color:#5a6480;line-height:1.6;margin:0;">One licensed, vetted agent who specializes in ${insuranceType} in your area. A real human decision.</p></td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
    <td style="width:34px;vertical-align:top;"><div style="background:#0d1f3c;color:#c9973a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:12px;font-family:Georgia,serif;">2</div></td>
    <td style="vertical-align:top;padding-left:10px;"><p style="font-size:13px;font-weight:700;color:#0d1f3c;margin:0 0 3px;">One agent reaches out — once</p><p style="font-size:12px;color:#5a6480;line-height:1.6;margin:0;">Your agent will contact you at <strong style="color:#0d1f3c;">${contactTime||'Anytime'}</strong>. One conversation. Real quotes. Zero pressure.</p></td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="width:34px;vertical-align:top;"><div style="background:#2d7a4f;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700;font-size:13px;">✓</div></td>
    <td style="vertical-align:top;padding-left:10px;"><p style="font-size:13px;font-weight:700;color:#0d1f3c;margin:0 0 3px;">Your phone stays quiet</p><p style="font-size:12px;color:#5a6480;line-height:1.6;margin:0;">Your info was shared with <strong>one agent only.</strong> We will never sell or share your data. Ever.</p></td>
  </tr></table>
</td></tr>
<tr><td class="padsm" style="padding:0 22px 22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:12px;"><tr><td align="center" style="padding:20px 14px;">
    <p style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:4px;margin:0 0 7px;">Our Promise to You</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#c9973a;margin:0 0 14px;">The One Call Guarantee™</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td class="gc" align="center" style="padding:0 10px;"><p class="gn" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c9973a;line-height:1;margin:0;">1</p><p style="font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin:3px 0 0;">Form</p></td>
      <td style="color:rgba(255,255,255,0.1);font-size:18px;padding:0 2px 6px;">·</td>
      <td class="gc" align="center" style="padding:0 10px;"><p class="gn" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c9973a;line-height:1;margin:0;">1</p><p style="font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin:3px 0 0;">Agent</p></td>
      <td style="color:rgba(255,255,255,0.1);font-size:18px;padding:0 2px 6px;">·</td>
      <td class="gc" align="center" style="padding:0 10px;"><p class="gn" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c9973a;line-height:1;margin:0;">1</p><p style="font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin:3px 0 0;">Call</p></td>
      <td style="color:rgba(255,255,255,0.1);font-size:18px;padding:0 2px 6px;">·</td>
      <td class="gc" align="center" style="padding:0 10px;"><p class="gn" style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#c9973a;line-height:1;margin:0;">0</p><p style="font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin:3px 0 0;">Spam</p></td>
    </tr></table>
  </td></tr></table>
</td></tr>
<tr><td class="padsm" align="center" style="padding:0 22px 26px;">
  <p style="font-size:13px;color:#5a6480;line-height:1.8;margin:0;">Have a question? Reply to this email or visit <a href="https://onecallshield.com" style="color:#c9973a;font-weight:700;text-decoration:none;">onecallshield.com</a></p>
</td></tr>
<tr><td align="center" style="background:#f8f4ee;padding:18px 22px;border-top:1px solid #e4e8f0;">
  <p style="font-family:Georgia,serif;font-size:12px;font-weight:700;color:#0d1f3c;margin:0 0 5px;">🛡️ OneCallShield</p>
  <p style="font-size:11px;color:#8a94b0;line-height:1.8;margin:0;">One Call. Real Coverage. Zero Hassle.<br>
  <a href="https://onecallshield.com" style="color:#c9973a;text-decoration:none;">onecallshield.com</a><br>
  <span style="font-size:10px;color:#b8c0cc;">© 2026 OneCallShield LLC · Your data is protected · We will never spam you</span></p>
</td></tr>
</table></td></tr></table></body></html>`;

      console.log('Sending admin email to:', ADMIN_EMAIL);
      const adminResult = await sendEmail(ADMIN_EMAIL, `New Lead: ${firstName} ${lastName} — ${insuranceType} | OneCallShield`, adminHtml);
      console.log('Admin email result:', JSON.stringify(adminResult));

      console.log('Sending consumer email to:', email);
      const consumerResult = await sendEmail(email, `Your OneCallShield request is confirmed, ${firstName}`, consumerHtml);
      console.log('Consumer email result:', JSON.stringify(consumerResult));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, adminResult, consumerResult }) };
    }

    // ── TYPE 2: Agent lead assignment ───────────────────────────────────────
    if (type === 'agent_lead') {
      console.log('agent_lead called, agentEmail:', data.agentEmail, 'agentName:', data.agentName);
      const { agentName, agentEmail, agentFirstName, consumerFirstName, consumerLastName, consumerPhone, consumerEmail, consumerAge, consumerZip, insuranceType, contactTime, lifeType, faceAmount, healthStatus, leadId } = data;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body,table,td,div,p{margin:0;padding:0;}body{-webkit-text-size-adjust:100%;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;}table{border-collapse:collapse;}
@media only screen and (max-width:600px){.ec{width:100%!important;}.pad{padding:20px 14px!important;}.padsm{padding:0 12px 18px!important;}.ht{font-size:20px!important;}}</style></head>
<body style="margin:0;padding:0;background:#f0f4f8;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f0f4f8;">Action required: New ${insuranceType} lead. Contact ${consumerFirstName} at ${contactTime||'Anytime'}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;"><tr><td align="center" style="padding:20px 10px;">
<table class="ec" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:#0d1f3c;padding:26px 22px 20px;">
  <div style="background:#c9973a;border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;font-size:20px;margin:0 auto 10px;">🛡️</div>
  <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:3px;">OneCallShield</div>
  <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Agent Portal</div>
</td></tr>
<tr><td style="background:#c9973a;height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="background:#fff8ec;padding:13px 22px;text-align:center;border-bottom:1px solid rgba(201,151,58,0.2);">
  <p style="font-size:11px;font-weight:700;color:#c9973a;text-transform:uppercase;letter-spacing:2px;margin:0;">⚡ Action Required — New Lead Assigned to You</p>
</td></tr>
<tr><td class="pad" align="center" style="padding:26px 26px 20px;">
  <p class="ht" style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#0d1f3c;line-height:1.25;margin:0 0 9px;">You have a new lead, ${agentFirstName}! 🎯</p>
  <p style="font-size:14px;color:#5a6480;line-height:1.7;margin:0;">A consumer has been exclusively matched to you for <strong style="color:#0d1f3c;">${insuranceType}</strong>. They expect <strong style="color:#0d1f3c;">one call</strong> — from you.</p>
</td></tr>
<tr><td class="padsm" style="padding:0 20px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:12px 16px 3px;"><p style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">🎯 Your Lead Details</p></td></tr>
    <tr><td style="padding:0 16px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);width:40%;">Full Name</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;color:#fff;font-weight:700;">${consumerFirstName} ${consumerLastName}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);">Phone</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:16px;color:#c9973a;font-weight:700;">${consumerPhone}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);">Email</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;color:#fff;font-weight:600;">${consumerEmail||'N/A'}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);">Age</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;color:#fff;font-weight:600;">${consumerAge||'N/A'}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);">ZIP Code</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;color:#fff;font-weight:600;">${consumerZip}</td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);">Insurance</td><td style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;color:#c9973a;font-weight:700;">${insuranceType}</td></tr>
        <tr><td style="padding:7px 0;${lifeType?'border-bottom:1px solid rgba(255,255,255,0.07);':''}font-size:12px;color:rgba(255,255,255,0.4);">Best Time to Call</td><td style="padding:7px 0;${lifeType?'border-bottom:1px solid rgba(255,255,255,0.07);':''}font-size:13px;color:#fff;font-weight:700;">${contactTime||'Anytime'}</td></tr>
        ${lifeType?`<tr><td style="padding:7px 0;font-size:12px;color:rgba(255,255,255,0.4);">Life Details</td><td style="padding:7px 0;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.5;">${lifeType} | ${faceAmount||'N/A'} | ${healthStatus||'N/A'}</td></tr>`:''}
      </table>
    </td></tr>
  </table>
</td></tr>
<tr><td class="padsm" align="center" style="padding:0 20px 20px;">
  <a href="https://onecallshield.com/portal" style="display:inline-block;background:#c9973a;color:#0d1f3c;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;font-family:'Helvetica Neue',Arial,sans-serif;">📋 View Lead in Your Portal →</a>
</td></tr>
<tr><td class="padsm" style="padding:0 20px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:10px;">
    <tr><td style="padding:12px 14px 3px;"><p style="font-size:10px;font-weight:700;color:#8a94b0;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">📋 Important Reminders</p></td></tr>
    <tr><td style="padding:0 14px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td style="width:20px;vertical-align:top;color:#c9973a;font-size:12px;font-weight:700;">1.</td><td style="padding-left:6px;font-size:12px;color:#0d1f3c;"><strong>Call at their preferred time: ${contactTime||'Anytime'}</strong></td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td style="width:20px;vertical-align:top;color:#c9973a;font-size:12px;font-weight:700;">2.</td><td style="padding-left:6px;font-size:12px;color:#0d1f3c;"><strong>You are the ONLY agent they will hear from.</strong> 100% exclusive.</td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="width:20px;vertical-align:top;color:#2d7a4f;font-size:12px;font-weight:700;">✓</td><td style="padding-left:6px;font-size:12px;color:#0d1f3c;"><strong>Log your outcome</strong> at <a href="https://onecallshield.com/portal" style="color:#c9973a;text-decoration:none;font-weight:600;">onecallshield.com/portal</a></td></tr></table>
    </td></tr>
  </table>
</td></tr>
<tr><td class="padsm" style="padding:0 20px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f5ee;border-radius:8px;border-left:3px solid #2d7a4f;"><tr><td style="padding:10px 13px;">
    <p style="font-size:11px;color:#2d7a4f;font-weight:700;margin:0 0 2px;">✅ TCPA Compliant Lead</p>
    <p style="font-size:11px;color:#5a6480;margin:0;line-height:1.5;">Consumer provided express written consent to be contacted by one licensed agent. Lead ID: ${leadId}</p>
  </td></tr></table>
</td></tr>
<tr><td align="center" style="background:#f8f4ee;padding:16px 20px;border-top:1px solid #e4e8f0;">
  <p style="font-family:Georgia,serif;font-size:12px;font-weight:700;color:#0d1f3c;margin:0 0 4px;">🛡️ OneCallShield Agent Network</p>
  <p style="font-size:11px;color:#8a94b0;line-height:1.7;margin:0;">Manage your leads at <a href="https://onecallshield.com/portal" style="color:#c9973a;text-decoration:none;">onecallshield.com/portal</a><br>
  <span style="font-size:10px;color:#b8c0cc;">© 2026 OneCallShield LLC · This lead is exclusively assigned to you</span></p>
</td></tr>
</table></td></tr></table></body></html>`;

      await sendEmail(agentEmail, `New Lead Assigned: ${insuranceType} | OneCallShield`, html);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ── TYPE 3: Agent application ───────────────────────────────────────────
    if (type === 'agent_application') {
      const { firstName, lastName, email, phone, agency, years, insuranceTypes, states, plan, applicationId } = data;

      const agentHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:20px 10px;"><tr><td align="center">
<table cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#0d1f3c;padding:26px 22px;text-align:center;">
  <div style="background:#c9973a;border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;font-size:20px;margin:0 auto 10px;">🛡️</div>
  <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;">OneCallShield</div>
  <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;">Agent Network</div>
</td></tr>
<tr><td style="background:#c9973a;height:3px;font-size:3px;">&nbsp;</td></tr>
<tr><td style="padding:28px 24px 22px;text-align:center;">
  <p style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:#0d1f3c;margin:0 0 10px;">Application Received, ${firstName}! 🎉</p>
  <p style="font-size:14px;color:#5a6480;line-height:1.7;margin:0;">Thank you for applying. We personally review every application and will be in touch within 24 hours.</p>
</td></tr>
<tr><td style="padding:0 24px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:10px;">
    <tr><td style="padding:13px 15px 3px;"><p style="font-size:10px;font-weight:700;color:#8a94b0;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">What happens next</p></td></tr>
    <tr><td style="padding:0 15px 13px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;"><tr><td style="width:26px;vertical-align:top;"><div style="background:#0d1f3c;color:#c9973a;width:22px;height:22px;border-radius:50%;text-align:center;line-height:22px;font-weight:700;font-size:11px;font-family:Georgia,serif;">1</div></td><td style="padding-left:8px;font-size:13px;color:#0d1f3c;"><strong>We review your application</strong><br><span style="color:#5a6480;font-size:12px;">Within 24 hours our team verifies your license.</span></td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;"><tr><td style="width:26px;vertical-align:top;"><div style="background:#0d1f3c;color:#c9973a;width:22px;height:22px;border-radius:50%;text-align:center;line-height:22px;font-weight:700;font-size:11px;font-family:Georgia,serif;">2</div></td><td style="padding-left:8px;font-size:13px;color:#0d1f3c;"><strong>You get portal access</strong><br><span style="color:#5a6480;font-size:12px;">We'll email your login credentials to ${email}.</span></td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="width:26px;vertical-align:top;"><div style="background:#2d7a4f;color:#fff;width:22px;height:22px;border-radius:50%;text-align:center;line-height:22px;font-size:13px;">🎁</div></td><td style="padding-left:8px;font-size:13px;color:#0d1f3c;"><strong>First month completely free</strong><br><span style="color:#5a6480;font-size:12px;">As a founding beta agent your first month is on us.</span></td></tr></table>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#f8f4ee;padding:15px 22px;text-align:center;border-top:1px solid #e4e8f0;">
  <p style="font-size:11px;color:#8a94b0;margin:0;">🛡️ OneCallShield LLC · One Call. Real Coverage. Zero Hassle.</p>
</td></tr>
</table></td></tr></table></body></html>`;

      const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f0f4f8;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="background:#0d1f3c;padding:18px;text-align:center;"><div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;">🛡️ OneCallShield Admin</div><div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:2px;margin-top:3px;">NEW AGENT APPLICATION</div></div>
<div style="background:#c9973a;height:3px;"></div>
<div style="padding:18px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:8px;"><tr><td style="padding:12px 13px;">
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Name</p><p style="font-size:13px;font-weight:700;color:#0d1f3c;margin:0 0 8px;">${firstName} ${lastName}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Email</p><p style="font-size:13px;color:#0d1f3c;margin:0 0 8px;">${email}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Phone</p><p style="font-size:13px;font-weight:700;color:#c9973a;margin:0 0 8px;">${phone||'N/A'}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Agency</p><p style="font-size:13px;color:#0d1f3c;margin:0 0 8px;">${agency||'Independent'}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Experience</p><p style="font-size:13px;color:#0d1f3c;margin:0 0 8px;">${years||'N/A'} years</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Types</p><p style="font-size:12px;color:#0d1f3c;margin:0 0 8px;">${(insuranceTypes||[]).join(', ')}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">States</p><p style="font-size:12px;color:#0d1f3c;margin:0 0 8px;">${(states||[]).slice(0,8).join(', ')}${(states||[]).length>8?'...':''}</p>
  <p style="font-size:11px;color:#8a94b0;margin:0 0 1px;">Plan</p><p style="font-size:13px;color:#0d1f3c;margin:0;">${plan==='monthly'?'Monthly':'Pay Per Lead'}</p>
</td></tr></table>
<div style="text-align:center;margin-top:14px;"><a href="https://onecallshield.com/admin" style="display:inline-block;background:#c9973a;color:#0d1f3c;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:8px;">Review in Admin →</a></div>
</div></div></body></html>`;

      await Promise.all([
        sendEmail(email, 'Application Received — OneCallShield Agent Network', agentHtml),
        sendEmail(ADMIN_EMAIL, `New Agent Application — ${firstName} ${lastName} | OneCallShield`, adminHtml)
      ]);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown type' }) };

  } catch (err) {
    console.error('Email function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
