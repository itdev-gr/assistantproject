import { useState } from 'preact/hooks';
import { ChatPanel } from './ChatPanel';
import { M } from './messages';

interface Props {
  hotelSlug: string;
  origin: string;
}

export function Bubble({ hotelSlug, origin }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="aga-root">
      <style>{styles}</style>
      {open ? (
        <div className="aga-panel" role="dialog" aria-label={M.title}>
          <header>
            <strong>{M.title}</strong>
            <button onClick={() => setOpen(false)} aria-label={M.closeAria}>
              ×
            </button>
          </header>
          <ChatPanel hotelSlug={hotelSlug} origin={origin} />
        </div>
      ) : (
        <button
          className="aga-bubble"
          aria-label={M.openAria}
          onClick={() => setOpen(true)}
        >
          💬
        </button>
      )}
    </div>
  );
}

const styles = `
  .aga-root { position: fixed; bottom: 16px; left: 16px; z-index: 999999; font-family: system-ui, sans-serif; }
  .aga-bubble { width: 56px; height: 56px; border-radius: 28px; border: none; background: #0c8ec5; color: #fff; font-size: 24px; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
  .aga-panel { width: min(360px, 92vw); height: min(560px, 80vh); background: #fff; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; }
  .aga-panel header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #eee; }
  .aga-panel header button { background: none; border: 0; font-size: 22px; cursor: pointer; }
`;
