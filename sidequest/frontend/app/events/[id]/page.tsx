import React from 'react';
import { EventDetailClient } from './EventDetailClient';

export function generateStaticParams() {
  return [
    { id: 'view' },
    { id: 'ev111111-1111-1111-1111-111111111111' },
    { id: 'ev222222-2222-2222-2222-222222222222' },
    { id: 'ev333333-3333-3333-3333-333333333333' },
    { id: 'ev444444-4444-4444-4444-444444444444' },
  ];
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}
