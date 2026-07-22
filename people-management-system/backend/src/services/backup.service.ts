import { google } from 'googleapis';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: config.google.refreshToken });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export async function backupDatabase() {
  const backupPath = path.join(__dirname, '../../backup.sql');
  await new Promise((resolve, reject) => {
    exec(`pg_dump ${config.dbUrl} > ${backupPath}`, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
  const fileMetadata = {
    name: `backup-${Date.now()}.sql`,
    parents: [config.google.driveFolderId],
  };
  const media = {
    mimeType: 'application/sql',
    body: fs.createReadStream(backupPath),
  };
  await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });
  fs.unlinkSync(backupPath);
}

export async function restoreDatabase(fileId: string) {
  const dest = fs.createWriteStream('restore.sql');
  await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
    (err, res) => {
      if (err) throw err;
      res!.data.pipe(dest);
    }
  );
  await new Promise((resolve) => dest.on('finish', resolve));
  await new Promise((resolve, reject) => {
    exec(`psql ${config.dbUrl} < restore.sql`, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
  fs.unlinkSync('restore.sql');
}
