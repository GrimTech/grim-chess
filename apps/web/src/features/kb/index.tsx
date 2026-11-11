// Knowledge base reader (/kb, /kb/*) and the audit report (/audit). OWNER: server agent.
import type { RouteObject } from 'react-router-dom';
import { AuditPage } from './AuditPage.tsx';
import { KbDocPage, KbOverview } from './KbReader.tsx';
import './kb.css';

export const kbRoutes: RouteObject[] = [
  { path: 'kb', element: <KbOverview /> },
  { path: 'kb/*', element: <KbDocPage /> },
  { path: 'audit', element: <AuditPage /> },
];
