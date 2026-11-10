import { useEffect, useReducer } from 'react';
import { initialLibrary, initialBatteries, initialSchedules } from '../data/automation.js';
import { nextId } from './automation.js';

const KEY = 'qualityview.automation.v1';
const initial = { library: initialLibrary, batteries: initialBatteries, schedules: initialSchedules, history: [] };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && Array.isArray(saved.library) ? { ...initial, ...saved } : initial;
  } catch {
    return initial;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'saveTest': {
      const t = action.test;
      if (t.id && state.library.some((x) => x.id === t.id)) {
        return { ...state, library: state.library.map((x) => (x.id === t.id ? t : x)) };
      }
      return { ...state, library: [...state.library, { ...t, id: nextId('AT', state.library.map((x) => x.id)) }] };
    }
    case 'addTests': {
      let lib = state.library;
      for (const t of action.tests) lib = [...lib, { ...t, id: nextId('AT', lib.map((x) => x.id)) }];
      return { ...state, library: lib };
    }
    case 'deleteTest':
      return {
        ...state,
        library: state.library.filter((x) => x.id !== action.id),
        batteries: state.batteries.map((b) => ({ ...b, tests: b.tests.filter((id) => id !== action.id) })),
      };
    case 'saveBattery': {
      const b = action.battery;
      if (state.batteries.some((x) => x.id === b.id)) return { ...state, batteries: state.batteries.map((x) => (x.id === b.id ? b : x)) };
      return { ...state, batteries: [...state.batteries, b] };
    }
    case 'addSchedule':
      return { ...state, schedules: [...state.schedules, { ...action.schedule, id: nextId('SCH', state.schedules.map((x) => x.id)) }] };
    case 'deleteSchedule':
      return { ...state, schedules: state.schedules.filter((x) => x.id !== action.id) };
    case 'logRun':
      return { ...state, history: [action.run, ...state.history].slice(0, 12) };
    case 'reset':
      return initial;
    default:
      return state;
  }
}

/** Automation state (test library, batteries, schedules, run history), kept in this browser. */
export default function useAutomation() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: state just lasts for this visit */
    }
  }, [state]);
  return [state, dispatch];
}
