import nodemailer from 'nodemailer';

export interface EmailAlertOptions {
  toEmail?: string;
  subject: string;
  batchName: string;
  totalOrdersCount: number;
  totalPaymentsCount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
  discrepanciesCount: number;
  topDiscrepancies: Array<{
    type: string;
    severity: string;
    orderId?: string | null;
    paymentId?: string | null;
    difference: number;
    description: string;
  }>;
}

export async function sendReconciliationAlertEmail(options: EmailAlertOptions): Promise<{ success: boolean; message: string }> {
  const recipient = options.toEmail || process.env.NOTIFICATION_EMAIL || 'alanthomasbiju01@gmail.com';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER || 'alanthomasbiju01@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  console.log(`[Email Alert Service] Preparing alert email to: ${recipient}...`);

  if (!smtpPass || smtpPass.trim() === '') {
    console.warn(`[Email Alert Service] SMTP_PASS / GMAIL_APP_PASSWORD not provided in .env yet. Alert logged to console & audit logs.`);
    return {
      success: false,
      message: 'SMTP_PASS / GMAIL_APP_PASSWORD not set in environment variables yet.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #2563eb; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { padding: 24px; }
    .kpi-grid { display: flex; gap: 12px; margin: 20px 0; }
    .kpi-box { flex: 1; background: #f1f5f9; padding: 12px; border-radius: 12px; text-align: center; }
    .kpi-val { font-size: 18px; font-weight: 700; color: #0f172a; }
    .kpi-lbl { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .risk-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .risk-val { font-size: 22px; font-weight: 800; color: #e11d48; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table th { background: #f8fafc; padding: 10px; font-size: 11px; text-align: left; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; color: #475569; }
    .table td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LedgerPulse Revenue Audit Alert</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">High-Priority Financial Discrepancy Notification</p>
    </div>

    <div class="content">
      <p style="font-size: 14px; margin-top: 0;">An automated revenue reconciliation batch audit finished with key financial risk findings requiring controller review.</p>

      <div class="risk-box">
        <div class="kpi-lbl" style="color: #be123c;">Net Money at Risk</div>
        <div class="risk-val">$${options.moneyAtRisk.toFixed(2)}</div>
        <div style="font-size: 12px; color: #9f1239; margin-top: 4px;">Found ${options.discrepanciesCount} audit discrepancies in batch: <strong>${options.batchName}</strong></div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-val">$${options.totalReconciledAmount.toFixed(2)}</div>
          <div class="kpi-lbl">Reconciled</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val">$${options.totalDisputedAmount.toFixed(2)}</div>
          <div class="kpi-lbl">Disputed</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val">${options.totalOrdersCount} / ${options.totalPaymentsCount}</div>
          <div class="kpi-lbl">Orders / Payments</div>
        </div>
      </div>

      <h3 style="font-size: 14px; margin-bottom: 8px;">Top Priority Discrepancies Sample</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Risk ($)</th>
          </tr>
        </thead>
        <tbody>
          ${options.topDiscrepancies.slice(0, 5).map(d => `
            <tr>
              <td><span style="font-weight: 700; color: ${d.severity === 'CRITICAL' ? '#e11d48' : '#d97706'}">${d.severity}</span></td>
              <td>${d.type}</td>
              <td style="font-family: monospace;">${d.orderId || d.paymentId || 'N/A'}</td>
              <td style="font-weight: 700; color: #e11d48;">$${Math.abs(d.difference).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Sent automatically by LedgerPulse Automated Audit Engine to ${recipient}.
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: `"LedgerPulse Audit Alerts" <${smtpUser}>`,
      to: recipient,
      subject: options.subject,
      html: htmlContent,
    });

    console.log(`[Email Alert Service] Email sent successfully! MessageID: ${info.messageId}`);
    return { success: true, message: `Email sent to ${recipient} (ID: ${info.messageId})` };
  } catch (error: any) {
    console.error('[Email Alert Service] Error sending email:', error);
    return { success: false, message: error.message || 'Failed to send SMTP email.' };
  }
}
