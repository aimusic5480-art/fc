import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import type { CallCredentials } from './callApi';
export * from './callApi';

export async function joinChannel(credentials: CallCredentials, onRemoteAudio?: (user: unknown) => void) {
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  let microphone: IMicrophoneAudioTrack | null = null;
  try {
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        try {
          Promise.resolve(user.audioTrack?.play()).catch(() => undefined);
        } catch {
          // The remote track may be removed while a call is ending.
        }
        onRemoteAudio?.(user);
      }
    });
    await client.join(credentials.appId, credentials.channel, credentials.token || null, credentials.uid);
    microphone = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([microphone]);
    return {
      leave: async () => {
        microphone?.close();
        await client.leave();
      },
      setMuted: async (muted: boolean) => {
        await microphone?.setEnabled(!muted);
      },
    };
  } catch (error) {
    microphone?.close();
    await client.leave().catch(() => undefined);
    throw error;
  }
}
