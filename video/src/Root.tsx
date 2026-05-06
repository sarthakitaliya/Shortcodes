import React from 'react';
import { Composition } from 'remotion';
import { ShortcodesPromo } from './ShortcodesPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortcodesPromo"
        component={ShortcodesPromo}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
