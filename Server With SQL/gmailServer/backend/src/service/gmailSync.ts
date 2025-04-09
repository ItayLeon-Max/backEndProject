import { google } from 'googleapis';
import GoogleCredential from '../models/googleCredential';
import Email from '../models/email';
import User from '../models/user';
// import { simpleParser } from 'mailparser';
import SpamEmail from '../models/spamEmail';
import Draft from '../models/draft';
import Label from '../models/labels';
import EmailLabel from '../models/emailLabel';
import SentEmail from '../models/sentEmail';

export async function syncInboxEmails(userId: string) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
  if (!credentials) throw new Error('Missing Google credentials');

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const messagesResponse = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults: 50
  });

  const messages = messagesResponse.data.messages || [];

  for (const message of messages) {
    const exists = await Email.findOne({ where: { gmailMessageId: message.id } });
    if (exists) continue;

    const msgDetail = await gmail.users.messages.get({ userId: 'me', id: message.id! });
    const payload = msgDetail.data.payload;
    const headers = payload?.headers || [];

    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || user.email;
    const date = headers.find(h => h.name === 'Date')?.value;

    const rawBody = payload?.parts?.find(p => p.mimeType === 'text/plain')?.body?.data ||
                    payload?.body?.data;

    const decodedBody = rawBody
      ? Buffer.from(rawBody, 'base64').toString('utf-8')
      : '';

    await Email.create({
      subject,
      body: decodedBody,
      fromEmail: from,
      toEmail: to,
      sentAt: date ? new Date(date) : null,
      userId: user.id,
      gmailId: msgDetail.data.id!,
      gmailMessageId: msgDetail.data.id!,
      threadId: msgDetail.data.threadId!,
    });
  }
}

export async function syncSpamEmails(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
  
    const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
    if (!credentials) throw new Error('Missing Google credentials');
  
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    oAuth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SPAM'],
      maxResults: 20
    });
  
    const messages = messagesResponse.data.messages || [];
  
    for (const message of messages) {
      let email = await Email.findOne({ where: { gmailMessageId: message.id } });
  
      if (!email) {
        const msgDetail = await gmail.users.messages.get({ userId: 'me', id: message.id! });
        const payload = msgDetail.data.payload;
        const headers = payload?.headers || [];
  
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || user.email;
        const date = headers.find(h => h.name === 'Date')?.value;
  
        const rawBody = payload?.parts?.find(p => p.mimeType === 'text/plain')?.body?.data ||
                        payload?.body?.data;
  
        const decodedBody = rawBody
          ? Buffer.from(rawBody, 'base64').toString('utf-8')
          : '';
  
        email = await Email.create({
          subject,
          body: decodedBody,
          fromEmail: from,
          toEmail: to,
          sentAt: date ? new Date(date) : null,
          userId: user.id,
          gmailId: msgDetail.data.id!,
          gmailMessageId: msgDetail.data.id!,
          threadId: msgDetail.data.threadId!,
          isSpam: true
        });
      } else {
        email.isSpam = true;
        await email.save();
      }
  
      const alreadyInSpam = await SpamEmail.findOne({
        where: {
          userId,
          emailId: email.id
        }
      });
  
      if (!alreadyInSpam) {
        await SpamEmail.create({
          userId,
          emailId: email.id
        });
      }
    }
  }

  export async function syncDraftEmails(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
  
    const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
    if (!credentials) throw new Error('Missing Google credentials');
  
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    oAuth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
    const draftsResponse = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: 20,
    });
  
    const drafts = draftsResponse.data.drafts || [];
  
    for (const draftMeta of drafts) {
      const draftId = draftMeta.id;
      if (!draftId) continue;
  
      const draftDetail = await gmail.users.drafts.get({
        userId: 'me',
        id: draftId,
      });
  
      const message = draftDetail.data.message;
      const payload = message?.payload;
      const headers = payload?.headers || [];
  
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
  
      const rawBody = payload?.parts?.find(p => p.mimeType === 'text/plain')?.body?.data ||
                      payload?.body?.data;
  
      const decodedBody = rawBody
        ? Buffer.from(rawBody, 'base64').toString('utf-8')
        : '';
  
      const existingDraft = await Draft.findOne({
        where: {
          subject,
          toEmail: to,
          userId: user.id,
          body: decodedBody
        }
      });
  
      if (!existingDraft) {
        await Draft.create({
          subject,
          body: decodedBody,
          toEmail: to,
          lastEditedAt: new Date(),
          userId: user.id,
        });
      }
    }
  }

  export async function syncLabels(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
  
    const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
    if (!credentials) throw new Error('Missing Google credentials');
  
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    oAuth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const labels = labelsResponse.data.labels || [];
  
    for (const label of labels) {
      if (!label.name) continue;
  
      // Check if label with same name already exists
      const exists = await Label.findOne({ where: { name: label.name } });
      if (!exists) {
        await Label.create({ name: label.name });
      }
    }
  
    console.log(`✅ Synced ${labels.length} labels for user ${user.email}`);
  }

  export async function syncEmailLabels(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
  
    const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
    if (!credentials) throw new Error('Missing Google credentials');
  
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    oAuth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
    const emails = await Email.findAll({ where: { userId: user.id } });
  
    for (const email of emails) {
      if (!email.gmailMessageId) continue;
  
      const msg = await gmail.users.messages.get({ userId: 'me', id: email.gmailMessageId });
      const labelIds = msg.data.labelIds || [];
  
      for (const labelName of labelIds) {
        // Check if this label exists in DB
        let label = await Label.findOne({ where: { name: labelName } });
        if (!label) {
          label = await Label.create({ name: labelName });
        }
  
        // Check if already linked
        const exists = await EmailLabel.findOne({ where: { emailId: email.id, labelId: label.id } });
        if (!exists) {
          await EmailLabel.create({ emailId: email.id, labelId: label.id });
        }
      }
    }
  
    console.log(`🏷️ Synced labels per email for user: ${user.email}`);
  }

  export async function syncSentEmails(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
  
    const credentials = await GoogleCredential.findOne({ where: { user_id: userId } });
    if (!credentials) throw new Error('Missing Google credentials');
  
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    oAuth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SENT'],
      maxResults: 100
    });
  
    const messages = messagesResponse.data.messages || [];
  
    for (const message of messages) {
      const exists = await SentEmail.findOne({ where: { gmailMessageId: message.id } });
      if (exists) continue;
  
      const msgDetail = await gmail.users.messages.get({ userId: 'me', id: message.id! });
      const payload = msgDetail.data.payload;
      const headers = payload?.headers || [];
  
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value;
  
      const rawBody = payload?.parts?.find(p => p.mimeType === 'text/plain')?.body?.data ||
                      payload?.body?.data;
  
      const decodedBody = rawBody
        ? Buffer.from(rawBody, 'base64').toString('utf-8')
        : '';
  
      await SentEmail.create({
        subject,
        body: decodedBody,
        fromEmail: from,
        toEmail: to,
        sentAt: date ? new Date(date) : null,
        userId: user.id,
        gmailId: msgDetail.data.id!,
        gmailMessageId: msgDetail.data.id!,
        threadId: msgDetail.data.threadId!,
      });
    }
  }

  export async function syncAllUsersInboxOnStart() {
    try {
      const users = await User.findAll();
      for (const user of users) {
        try {
          console.log(`📥 Syncing inbox for user: ${user.email}`);
          await syncInboxEmails(user.id);
  
          console.log(`🧹 Syncing spam for user: ${user.email}`);
          await syncSpamEmails(user.id);
  
          console.log(`✏️ Syncing drafts for user: ${user.email}`);
          await syncDraftEmails(user.id);
  
          console.log(`🏷️ Syncing labels for user: ${user.email}`);
          await syncLabels(user.id);
  
          console.log(`🔗 Syncing email-label relations for user: ${user.email}`);
          await syncEmailLabels(user.id);
  
          console.log(`📤 Syncing sent emails for user: ${user.email}`);
          await syncSentEmails(user.id);
  
          console.log(`✅ Finished syncing for user: ${user.email}`);
        } catch (e: any) {
          console.error(`❌ Failed syncing for user ${user.email}:`, e.message);
        }
      }
    } catch (e) {
      console.error('Error loading users for sync:', e);
    }
  }