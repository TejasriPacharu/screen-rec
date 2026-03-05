// backend/src/services/transcription.service.ts
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { ELEVENLABS_API_KEY } from '../config';

// ElevenLabs Scribe response shape (only fields we use)
interface ScribeResponse {
  text: string;
  // ElevenLabs also returns `words`, `language_code`, etc. — unused here
}

export const transcribeVideo = async (filePath: string): Promise<string> => {
  console.log('[Transcription] Sending file to ElevenLabs Scribe...');

  const form = new FormData();

  // `file` must be the audio/video blob — Scribe accepts webm directly
  form.append('file', fs.createReadStream(filePath), {
    filename: 'recording.webm',
    contentType: 'video/webm',
  });

  // scribe_v1 is the model name for ElevenLabs Speech-to-Text
  form.append('model_id', 'scribe_v1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `ElevenLabs Scribe request failed [${response.status}]: ${errorBody}`
    );
  }

  const data = (await response.json()) as ScribeResponse;

  const transcript = data.text?.trim();
  if (!transcript) throw new Error('Transcription returned empty result.');

  console.log('[Transcription] Scribe transcription complete.');
  return transcript;
};