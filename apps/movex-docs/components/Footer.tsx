import React from 'react';
import { Logo } from '../modules/Logo';
import { HeartIcon } from '@heroicons/react/24/solid';

export const Footer: React.FC = () => {
  return (
    <div className='flex flex-1 justify-between items-end'>
      <div>
        <Logo />
      </div>
      <div className="pt-4 text-right">
        <span>Movex is a Moves That Matter project.</span>
        <p>
          Made with{' '}
          <HeartIcon
            style={{
              width: '20px',
              display: 'inline',
            }}
          />{' '}
          around the world.
        </p>
      </div>
    </div>
  );
};
