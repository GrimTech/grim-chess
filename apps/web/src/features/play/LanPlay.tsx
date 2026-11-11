// /play/lan: same client as online, plus instructions for joining from other devices on the same Wi-Fi.
import { useEffect, useState } from 'react';
import { api, type ServerInfo } from '../../lib/api.ts';
import { QrCode } from './components/QrCode.tsx';
import { OnlinePlay } from './OnlinePlay.tsx';

export function LanPlay() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.serverInfo().then(setInfo).catch((e: Error) => setErr(e.message)); }, []);
  const lanUrl = info?.mode === 'lan' ? info.lanUrls[0] ?? null : null;
  return <OnlinePlay mode="lan" shareBase={lanUrl} header={<LanInfo info={info} err={err} />} />;
}

function LanInfo({ info, err }: { info: ServerInfo | null; err: string | null }) {
  if (err) return <section className="card"><p className="error">Could not reach the server ({err}).</p><HowTo /></section>;
  if (!info) return <section className="card"><div className="skeleton" style={{ height: 80 }} /></section>;
  if (info.mode === 'lan') {
    const urls = info.lanUrls;
    return (
      <section className="card play-lan">
        <div className="stack">
          <h2 className="card__title">This computer is hosting a LAN server</h2>
          <p className="card__subtitle">Others on the same Wi-Fi can open this address (or scan the code), then create or join a room below. Games never leave your network.</p>
          {urls.length ? (
            <ul className="play-lanurls">{urls.map((u) => <li key={u}><a className="input-mono" href={u}>{u}</a></li>)}</ul>
          ) : <p className="hint">No network address detected. Is this computer connected to Wi-Fi or Ethernet?</p>}
          <p className="hint">If another device cannot connect, allow Node.js through this computer’s firewall for private networks.</p>
        </div>
        {urls[0] && <QrCode text={urls[0]} size={176} label={`QR code for ${urls[0]}`} />}
      </section>
    );
  }
  return (
    <section className="card">
      <h2 className="card__title">LAN mode is not running here</h2>
      <p className="card__subtitle">
        {info.mode === 'cloud' ? 'You are on the hosted (internet) server. To play over a local network without the internet, run Grim Chess on one computer:'
          : 'This is a development server. To host a LAN game:'}
      </p>
      <HowTo />
      <p className="hint">You can still use the lobby below; it plays over {info.mode === 'cloud' ? 'the internet' : 'this server'}.</p>
    </section>
  );
}

function HowTo() {
  return (
    <ol className="play-howto">
      <li>Install Node.js 24+ and get the Grim Chess source.</li>
      <li>In the project folder run <code>npm install &amp;&amp; npm run build &amp;&amp; npm run lan</code><br />
        (or with Docker: <code>docker run -p 8080:8080 &lt;grim-chess-image&gt; --lan</code>).</li>
      <li>The server prints its address, e.g. <code>http://192.168.1.20:8080</code>. Everyone on the same Wi-Fi opens it and goes to Play → LAN.</li>
    </ol>
  );
}
