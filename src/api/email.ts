import { Email, EmailResponse } from '@/types';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

/**
 * Email API for sending notifications and emails
 * Supports multiple providers: SendGrid, Nodemailer, Cloudflare
 */
export class EmailAPI {
  private provider: 'sendgrid' | 'nodemailer' | 'cloudflare';
  private transporter?: any;
  private sgClient?: typeof sgMail;
  private fromEmail: string;

  constructor(config: {
    provider: 'sendgrid' | 'nodemailer' | 'cloudflare';
    apiKey: string;
    from: string;
    smtpConfig?: {
      host: string;
      port: number;
      auth: { user: string; pass: string };
    };
  }) {
    this.provider = config.provider;
    this.fromEmail = config.from;

    switch (config.provider) {
      case 'sendgrid':
        sgMail.setApiKey(config.apiKey);
        this.sgClient = sgMail;
        break;

      case 'nodemailer':
        if (!config.smtpConfig) {
          throw new Error('SMTP configuration required for nodemailer provider');
        }
        this.transporter = nodemailer.createTransport(config.smtpConfig);
        break;

      case 'cloudflare':
        // Cloudflare Email Routing integration
        // Uses Cloudflare Queues or Workers for async processing
        break;
    }
  }

  /**
   * Send a single email
   */
  async send(email: Email): Promise<EmailResponse> {
    const timestamp = new Date();

    try {
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(email, timestamp);

        case 'nodemailer':
          return await this.sendViaNodemailer(email, timestamp);

        case 'cloudflare':
          return await this.sendViaCloudflare(email, timestamp);

        default:
          throw new Error(`Unknown email provider: ${this.provider}`);
      }
    } catch (error: any) {
      return {
        id: this.generateId(),
        status: 'failed',
        message: error.message || 'Failed to send email',
        timestamp,
      };
    }
  }

  /**
   * Send multiple emails
   */
  async sendBatch(emails: Email[]): Promise<EmailResponse[]> {
    const results = await Promise.all(emails.map((email) => this.send(email)));
    return results;
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(
    email: Email,
    timestamp: Date
  ): Promise<EmailResponse> {
    const message: any = {
      to: email.to,
      from: email.from,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
    };

    if (email.cc) message.cc = email.cc;
    if (email.bcc) message.bcc = email.bcc;
    if (email.attachments) {
      message.attachments = email.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
      }));
    }

    await this.sgClient!.send(message);

    return {
      id: this.generateId(),
      status: 'sent',
      timestamp,
    };
  }

  /**
   * Send via Nodemailer
   */
  private async sendViaNodemailer(
    email: Email,
    timestamp: Date
  ): Promise<EmailResponse> {
    const mailOptions: any = {
      from: email.from,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
    };

    if (email.cc)
      mailOptions.cc = Array.isArray(email.cc) ? email.cc.join(', ') : email.cc;
    if (email.bcc)
      mailOptions.bcc = Array.isArray(email.bcc)
        ? email.bcc.join(', ')
        : email.bcc;
    if (email.attachments) {
      mailOptions.attachments = email.attachments;
    }

    const result = await this.transporter.sendMail(mailOptions);

    return {
      id: result.messageId || this.generateId(),
      status: 'sent',
      timestamp,
    };
  }

  /**
   * Send via Cloudflare Email Routing (async via Queues)
   */
  private async sendViaCloudflare(
    email: Email,
    timestamp: Date
  ): Promise<EmailResponse> {
    // In a real implementation, this would queue the email
    // for processing via Cloudflare Queues or a cron worker
    const id = this.generateId();

    return {
      id,
      status: 'pending',
      message: 'Email queued for sending via Cloudflare',
      timestamp,
    };
  }

  /**
   * Send templated email
   */
  async sendTemplate(
    to: string | string[],
    template: string,
    variables: Record<string, any>,
    options?: { replyTo?: string; cc?: string[]; bcc?: string[] }
  ): Promise<EmailResponse> {
    // Template rendering would happen here
    // This is a simplified version
    const html = this.renderTemplate(template, variables);

    return this.send({
      to,
      from: this.fromEmail,
      subject: variables.subject || 'Email from whoscrizzz.com',
      html,
      replyTo: options?.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(email: string, username: string): Promise<EmailResponse> {
    return this.sendTemplate(email, 'welcome', {
      username,
      subject: `Welcome to whoscrizzz.com, ${username}!`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    resetToken: string,
    resetUrl: string
  ): Promise<EmailResponse> {
    return this.sendTemplate(email, 'password-reset', {
      resetToken,
      resetUrl,
      subject: 'Reset your whoscrizzz.com password',
    });
  }

  /**
   * Send verification email
   */
  async sendVerification(
    email: string,
    verificationToken: string,
    verificationUrl: string
  ): Promise<EmailResponse> {
    return this.sendTemplate(email, 'verification', {
      verificationToken,
      verificationUrl,
      subject: 'Verify your whoscrizzz.com email',
    });
  }

  /**
   * Render email template
   */
  private renderTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    let html = template;

    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return html;
  }

  /**
   * Generate unique email ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create email API instance from environment config
 */
export function createEmailAPI(config: {
  provider: 'sendgrid' | 'nodemailer' | 'cloudflare';
  apiKey: string;
  from: string;
  smtpConfig?: any;
}): EmailAPI {
  return new EmailAPI(config);
}
