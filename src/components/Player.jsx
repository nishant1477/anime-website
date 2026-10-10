import React, { useEffect, useRef, useState } from 'react';
import { Film } from 'lucide-react';

export function PlayerMessage({ icon: Icon = Film, title, children }) {
  return (
    <div className="player-message">
      <Icon size={30} aria-hidden="true" />
      <strong>{title}</strong>
      {children}
    </div>
  );
}

// Plays the resolved direct stream (HLS / MP4) when there is one, and falls
// back to the provider embed otherwise. hls.js is loaded on demand so it never
// weighs on pages that don't play video.
export function StreamPlayer({ stream }) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const resolvedUrl = stream.resolved?.url;
  const streamUrl = resolvedUrl || stream.url;
  const isHls = stream.resolved?.type === 'hls' || /\.m3u8($|\?)/i.test(streamUrl || '');
  const isFile = !isHls && /\.(mp4|webm)(\?|$)/i.test(streamUrl || '');

  useEffect(() => setFailed(false), [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!isHls || !video || !streamUrl || failed) return undefined;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return undefined;
    }
    let hls;
    let cancelled = false;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) { setFailed(true); return; }
      hls = new Hls({ enableWorker: true });
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setFailed(true); });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    }).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; hls?.destroy(); };
  }, [isHls, streamUrl, failed]);

  if (!failed && (isHls || isFile) && streamUrl) {
    return (
      <video
        key={streamUrl}
        ref={videoRef}
        className="video"
        controls
        playsInline
        preload="metadata"
        src={isFile ? streamUrl : undefined}
        onError={() => setFailed(true)}
      />
    );
  }
  // Embed fallback: used when no direct stream exists or direct playback failed.
  if (stream.url && !/\.(m3u8|mp4|webm)($|\?)/i.test(stream.url)) {
    return <iframe className="video" src={stream.url} title="Episode player" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return (
    <PlayerMessage title="This stream won’t play">
      <p>Try another server or episode.</p>
    </PlayerMessage>
  );
}
