/* eslint-disable react-hooks/refs */
import './StateSelector.css';

import { autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { ALL_STATES_CONFIG, STATES } from '../lib/cameras';
import { useTraffic } from '../lib/TrafficContext';


function StateRow({ id, count, video, active, open, offline }: { id: string; name?: string; count: number; video: boolean; active?: boolean; open?: boolean; offline?: boolean }) {
  return (
    <>
      <span className={`state-row-name ${offline ? 'state-row-offline' : ''}`}>{id.toUpperCase()}</span>
      <span className="state-row-meta">{offline ? 'Offline' : `${count} ${video ? 'Videos' : 'Images'}`}</span>
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

  const otherStates = STATES.filter((s) => s.id !== stateId).sort((a, b) => a.name.localeCompare(b.name));
  const showAll = stateId !== 'all';

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
          <div className="state-selector-sep" />
          {showAll && (
            <button
              className="state-selector-option"
              onClick={() => { setState('all'); setOpen(false); }}
            >
              <StateRow id="all" name={ALL_STATES_CONFIG.name} count={ALL_STATES_CONFIG.cameraCount ?? 0} video={ALL_STATES_CONFIG.supportsVideo} />
            </button>
          )}
          {otherStates.map((s) => (
            <button
              key={s.id}
              className="state-selector-option"
              onClick={() => { setState(s.id); setOpen(false); }}
            >
              <StateRow id={s.id} name={s.name} count={s.cameraCount ?? 0} video={s.supportsVideo} offline={s.offline} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
