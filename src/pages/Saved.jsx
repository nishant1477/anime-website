import React from 'react';
import { Bookmark } from 'lucide-react';
import { useDocumentTitle } from '../hooks.js';
import { EmptyState, PageHeading, PosterGrid } from '../components/ui.jsx';

export default function Saved({ savedState }) {
  useDocumentTitle('Saved');
  const { saved } = savedState;
  return (
    <div className="wrap page">
      <PageHeading
        title="Saved titles"
        copy={saved.length ? `${saved.length} saved on this device.` : 'Titles you save stay on this device.'}
      />
      {saved.length ? (
        <PosterGrid items={saved} savedState={savedState} />
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          copy="Use the + on any poster, or Save on a title page, and it will show up here."
          action={<a className="btn btn-primary" href="#/search">Find a title</a>}
        />
      )}
    </div>
  );
}
