/* eslint-disable react-hooks/refs */
import './StateSelector.css';

import { autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { STATES } from '../lib/cameras';
import { useTraffic } from '../lib/TrafficContext';

const STATE_PATHS: Record<string, { viewBox: string; d: string }> = {
  sc: {
    viewBox: '0 0 85 80',
    d: 'M68.24 46.080l0.32-0.72v-0.32l-0.32 0.32v0.72zM19.76 3.84l-0.24-0.32-0.64 0.8-4 0.88-1.040 1.040-5.84 1.28-3.2 3.36-0.8 2.16 2.96 2 1.92 2.24 2.96 0.8 2 5.52 1.84 2.32 0.56 1.68 4.8 3.68 1.52 3.2 1.84 0.72 2 2 0.16 2.16 1.36 1.12-0.16 0.88 1.2 0.96 0.16 1.040 4 2.32 0.32 2.16 1.52 3.52v2.24l3.36 2.8 1.12 3.2-0.48 2.48 1.36 2h1.2l1.84 1.040 1.68-4.16 0.16 0.8-0.72 1.84 2.32-2-1.84-2-1.12-4.32 1.2 0.96 0.48 2.56 1.28 1.12v-3.040h0.4l0.32 3.76 2.8-1.2 0.56-1.68-1.84 1.2 1.44-1.36-2.16-0.64 1.84-0.4-3.36-0.32 0.080-0.48h2.32l-0.16-0.88 2.48 1.68 0.48-1.12 0.56 0.96 2-1.52-0.88-1.28 1.36 1.12 2.72-0.8-0.24-0.72 1.2-0.16 1.2-0.96 0.16-0.72-1.68-0.8h0.64l-0.32-1.36h0.88l-0.24 1.040 1.36 0.8 3.84-3.12 0.32-0.4-0.64 0.4-0.32-0.4 0.64-1.52 1.040-0.48 0.48 0.88 1.68-0.4 0.32-0.96 1.2-0.88-0.72-0.96 1.040 0.64v-0.8l0.8 0.48 0.56-0.8-1.84-2.24 1.12-2.16 0.56-0.64-1.2 2.48 0.88 0.32 0.48 1.52 0.8-3.84 3.040-4.48 2.8-2.56 3.040-1.36-0.48-0.64 0.48-0.16-17.6-17.28-18-0.48-0.080-2.64-2.32-2.88-1.84 0.88-0.16-1.68z',
  },
  ga: {
    viewBox: '0 0 60 80',
    d: 'M49.52 60.64v-0.88l0.48-2.080-0.88 1.040zM10 37.92l-0.24 1.12 1.040 0.88-1.52 1.44-1.44 4.56 1.12 3.68-0.88 4.72 0.88 1.28 0.16 1.52 1.44 3.44 29.92 2.32 0.8 2.56 1.44-0.080 0.48-2.72-0.32-2 0.72-1.12 5.36 1.44-0.32-1.84 0.48 0.080-0.16-0.88 0.56-0.64-0.64-0.4 0.64-0.4-0.64-0.88 0.96 0.88 0.16-1.44-0.4 0.72-0.48-0.72 0.4 0.16v-1.2l0.32-0.080 0.56 0.96 1.12-1.44-0.64-0.88-1.76-0.64 2.4 0.4-0.64-1.2 0.64 0.48 1.2-2.080-1.44 0.72 0.24-0.56-0.64-0.24 1.44-0.64-0.48-0.56 0.88 0.96 0.24-1.44v-0.4l-0.080 0.4-1.040 0.24 0.48-0.64-0.88-0.72 2 0.32 0.8-1.2-1.28-0.24 0.56-0.4-0.32-0.32 1.6 0.4 0.48-0.4-0.4-0.48 0.4-0.48 0.4 0.24 0.72-0.64-3.44-1.68v-2.48l-0.64-2.080-2.32-1.76v-1.68l-1.36-3.92-2.64-1.44-0.24-1.040-0.88-0.4 0.16-0.72-0.96-0.64v-1.44l-2.8-1.76-0.96-2.24-3.28-2.56-1.68-2.72-1.68-3.76-1.84-0.56-1.44-1.44-1.84-1.44 0.32-1.44 2.24-2.32-27.12-0.48 3.68 27.28 0.88 3.76z',
  },
  nc: {
    viewBox: '0 0 104 80',
    d: 'M49.36 21.2l-15.92-1.36-0.56 3.36-1.92 0.48-1.92 2.64-1.6-0.72-3.84 2.48-0.8-1.36-1.84 1.84-0.88-0.48-1.2 2.080-1.92 0.4-3.68 2.4-4.24 0.4-1.36 1.2-0.72 1.92-2.4 0.4-0.56 3.28 13.28 0.4 7.92-2.48 14.24 1.2v1.040l1.36-0.64 1.52 2.24 0.080 1.6 12.24 0.56 11.92 12.4 2.080-1.2 3.68 0.8 1.040-1.52-0.32-2.48 0.64 1.2-0.16 2.16 2.080-5.12 2-1.92 1.76-0.72-0.72-1.2 0.72-0.48-0.56-1.44 1.2 1.36-0.72 0.72 0.8 0.4 1.92-1.6v-1.040l0.48 1.040 2.080-0.72h2.16l-0.88-0.32 1.040-0.56 0.56 1.2 0.16-1.52 1.2 1.040 2.48-3.040-0.96-0.8 0.4 0.64-1.44 0.56 0.080-1.76-0.4 1.36-0.88-0.16 0.32 0.72-0.96-0.72-1.28 1.12-2.24-0.96-1.44-2.24 3.36 2.080 2.4-1.76-0.16-0.8-1.2 0.16 2.080-1.44-5.28-1.92-1.040-1.36 4.96 1.68-0.56-1.68 1.92-0.24-1.2 0.56 1.040 1.36 0.72-0.96 0.64 1.52 0.16-0.72 2.16 0.72 1.36-0.88 1.44-3.12 0.48 0.88 1.12-0.88v-2.48l-1.28-1.92 0.16 0.56h-0.8l0.32 0.72-0.72-0.56-0.56 0.48-0.32 3.2-1.2-0.56 1.2-0.16-1.040-1.2h0.72v-2.48l-2.48 0.16 0.24 0.56-1.76-0.72-3.2 0.56 0.32-0.72-0.8-1.6 0.16-2.56 0.64 0.48-0.32 1.36 0.32 1.76 1.12 0.56 2.96-1.2-1.76-1.6 2.64 1.52-0.72-1.68 1.36 1.2 1.12-0.48-1.44-2 2.96 1.92-0.64-1.84 1.92 2.96-1.44-4.56v0.8l-0.56-0.48v-0.32l-0.64-0.56v-1.040z',
  },
  va: {
    viewBox: '0 0 92 80',
    d: 'M62.080 19.6l-4.64-3.52-0.8 3.52-4.32 4.56-1.28-0.72-2.88 5.36-2.16-0.72-0.24-1.2-1.12-0.48-1.52 4.16-4.88 7.2 0.56 0.8-0.72 1.36-1.6 1.12-0.72-0.56-2.16 0.96-1.12-0.4-0.24 1.12-3.52 0.8-1.44-1.12-2.16 1.52-3.44-2.16-0.24-2.080-3.76 3.040-3.44 1.76-2.080 2.88-2 0.4-0.72 1.2-5.44 1.52 35.68 2.16h20.64l20.32-0.24-0.16-0.56 0.8 0.56v-2.4l1.28 2.4-1.52-4.64-3.28-0.4 0.16 1.2-0.8-0.4-1.52 0.4 0.56-1.2-1.84-1.12-0.24-1.76-0.64 0.4-2.32-0.96-0.56-0.72-0.56 0.32-1.92-0.4 0.16-0.56 2.080 0.8 0.32-0.56 0.72 1.12 0.8-1.12 1.28 1.68 0.88-0.4 2.4 2.96 1.040-0.4 0.4-1.12-0.64-0.080 0.24-0.48-0.8-1.040-1.52-0.4-2.72-3.040 0.16-0.24 3.36 3.28 0.88-0.32-0.72-0.48 0.32-1.52 1.44 1.6 0.16-2.32-1.52-0.24 0.96-0.56-2.4-0.8-4.16-5.44-1.92-0.96 0.72-0.16 1.2 0.96 4.4 5.44 0.4-0.64 1.6 0.8-0.4-2.72 0.96 0.4v-1.12l-2.8-1.36-0.72-1.6-1.36 0.080-2.080-0.8-1.2-1.36 0.56-0.24-0.24-0.72-3.2 0.72 0.72-0.32-0.88-0.8 0.56 0.4 0.72-2.96 0.64 0.080 0.16-0.8 0.96-0.56v-1.92l-2.16-1.84-2.24-0.96 0.48-1.2-1.12-1.040-1.68-0.24z',
  },
};

export function StateIcon({ id }: { id: string }) {
  const state = STATE_PATHS[id];
  if (!state) { return null; }
  return (
    <svg viewBox={state.viewBox} className="state-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={state.d} />
    </svg>
  );
}

function StateRow({ id, count, video, active, open }: { id: string; name?: string; count: number; video: boolean; active?: boolean; open?: boolean }) {
  return (
    <>
      <span className="state-row-name">{id.toUpperCase()}</span>
      <span className="state-row-meta">{count} {video ? 'Videos' : 'Images'}</span>
      {active && <ChevronDown size={12} className={`state-selector-caret ${open ? 'state-selector-caret-open' : ''}`} />}
    </>
  );
}

export function StateSelector() {
  const { stateId, stateConfig, setState } = useTraffic();
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [offset(({ rects }) => -rects.reference.height), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const otherStates = STATES.filter((s) => s.id !== stateId);

  return (
    <>
      <button className={`state-selector-trigger ${open ? 'state-selector-trigger-open' : ''}`} ref={refs.setReference} {...getReferenceProps()}>
        <StateRow id={stateId} name={stateConfig.name} count={stateConfig.cameraCount ?? 0} video={stateConfig.supportsVideo} active open={open} />
      </button>
      {open && (
        <div className="state-selector-dropdown" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
          <button className="state-selector-option state-selector-option-active" onClick={() => setOpen(false)}>
            <StateRow id={stateId} name={stateConfig.name} count={stateConfig.cameraCount ?? 0} video={stateConfig.supportsVideo} active open />
          </button>
          {otherStates.map((s) => (
            <button
              key={s.id}
              className="state-selector-option"
              onClick={() => { setState(s.id); setOpen(false); }}
            >
              <StateRow id={s.id} name={s.name} count={s.cameraCount ?? 0} video={s.supportsVideo} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
