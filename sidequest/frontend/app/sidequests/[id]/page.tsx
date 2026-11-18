import React from 'react';
import { SideQuestDetailClient } from './SideQuestDetailClient';

export function generateStaticParams() {
  return [
    { id: 'view' },
    { id: 'sq111111-1111-1111-1111-111111111111' },
    { id: 'sq222222-2222-2222-2222-222222222222' },
    { id: 'sq333333-3333-3333-3333-333333333333' },
    { id: 'sq444444-4444-4444-4444-444444444444' },
    { id: 'sq555555-5555-5555-5555-555555555555' },
    { id: 'sq666666-6666-6666-6666-666666666666' },
  ];
}

export default function SideQuestDetailPage() {
  return <SideQuestDetailClient />;
}
