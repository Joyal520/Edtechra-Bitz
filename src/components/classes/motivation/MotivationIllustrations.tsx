import React from 'react';
import { MotivationSceneId } from './motivationData';

const D = '#1c1c1c';
const P = '#f06fa8';
const T = '#1f7a7a';
const B = '#3b7de0';
const W = '#ffffff';
const Y = '#ffd86b';

const DEFAULT_LEFT_ARM = 'M64 128Q40 152 46 188';
const DEFAULT_RIGHT_ARM = 'M136 128Q160 152 154 188';

const SparkleStar: React.FC<{ x: number; y: number; s?: number; className?: string }> = ({
  x,
  y,
  s = 1,
  className,
}) => (
  <path
    className={className}
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0-12L3-3 12 0 3 3 0 12-3 3-12 0-3-3Z"
    fill={W}
  />
);

const BeanArms: React.FC<{ left?: string; right?: string }> = ({
  left = DEFAULT_LEFT_ARM,
  right = DEFAULT_RIGHT_ARM,
}) => (
  <g fill="none" stroke={T} strokeWidth={11} strokeLinecap="round">
    <path d={left} />
    <path d={right} />
  </g>
);

const BeanCharacter: React.FC<{ color: string; closedEyes?: boolean }> = ({
  color,
  closedEyes = false,
}) => (
  <g strokeLinecap="round">
    <path d="M90 170v52M110 170v52" stroke={D} strokeWidth={9} />
    <ellipse cx={86} cy={226} rx={17} ry={8} fill={B} />
    <ellipse cx={114} cy={226} rx={17} ry={8} fill={B} />
    <path
      d="M100 60C138 60 150 100 146 135 142 170 124 180 100 180 76 180 58 170 54 135 50 100 62 60 100 60Z"
      fill={color}
    />
    {closedEyes ? (
      <path
        d="M80 98q8 8 16 0M104 98q8 8 16 0"
        fill="none"
        stroke={D}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    ) : (
      <>
        <circle cx={88} cy={96} r={10} fill={W} stroke={D} strokeWidth={2} />
        <circle cx={112} cy={96} r={10} fill={W} stroke={D} strokeWidth={2} />
        <circle cx={90} cy={97} r={4.5} fill={D} />
        <circle cx={114} cy={97} r={4.5} fill={D} />
      </>
    )}
    <path d="M90 122q10 10 20 0" fill="none" stroke={D} strokeWidth={3.5} />
  </g>
);

interface SceneDefinition {
  closedEyes?: boolean;
  back: React.ReactNode;
  leftArm?: string;
  rightArm?: string;
  prop: React.ReactNode;
}

const SCENES: Record<MotivationSceneId, SceneDefinition> = {
  0: {
    back: (
      <>
        <circle cx={100} cy={110} r={84} fill={W} />
        <SparkleStar x={30} y={60} className="tm-star-twinkle" />
        <SparkleStar x={172} y={70} s={0.8} className="tm-star-twinkle-delay" />
      </>
    ),
    leftArm: 'M64 128Q40 150 52 120',
    rightArm: 'M136 128Q150 140 120 150',
    prop: (
      <g transform="rotate(18 150 150)">
        <path
          d="M144 40l8-10 8 10v100h-16z"
          fill={W}
          stroke={D}
          strokeWidth={2.5}
        />
        <rect x={134} y={138} width={36} height={9} rx={3} fill={T} />
      </g>
    ),
  },
  1: {
    back: <path d="M20 238h160" stroke={D} strokeWidth={3} />,
    leftArm: 'M64 128Q40 150 46 188',
    rightArm: 'M136 128Q158 112 116 126',
    prop: (
      <>
        <g transform="rotate(-35 40 190)">
          <rect
            x={30}
            y={150}
            width={14}
            height={60}
            fill={Y}
            stroke={D}
            strokeWidth={2.5}
          />
          <path d="M30 210l7 16 7-16z" fill={D} />
          <rect
            x={30}
            y={140}
            width={14}
            height={12}
            fill={P}
            stroke={D}
            strokeWidth={2.5}
          />
        </g>
        <path
          d="M150 40l8 8M170 30l-4 12M180 55h-12"
          stroke={D}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    ),
  },
  2: {
    back: (
      <>
        <path
          d="M10 238L80 70l50 100 20-34 40 102z"
          fill={W}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M80 70v-26" stroke={D} strokeWidth={3} />
        <path d="M80 44l24 8-24 8z" fill={P} />
      </>
    ),
    leftArm: 'M64 128Q36 100 44 62',
    rightArm: 'M136 128Q164 100 156 62',
    prop: null,
  },
  3: {
    back: (
      <>
        <rect
          x={20}
          y={190}
          width={30}
          height={48}
          fill={Y}
          stroke={D}
          strokeWidth={2.5}
        />
        <rect
          x={150}
          y={150}
          width={30}
          height={88}
          fill={Y}
          stroke={D}
          strokeWidth={2.5}
        />
      </>
    ),
    leftArm: 'M64 128Q36 160 52 150',
    rightArm: 'M136 128Q164 160 148 150',
    prop: (
      <path
        d="M26 170l10-14 10 14M156 130l10-14 10 14"
        fill="none"
        stroke={D}
        strokeWidth={3}
        strokeLinecap="round"
      />
    ),
  },
  4: {
    back: (
      <>
        <SparkleStar x={40} y={70} className="tm-star-twinkle" />
        <SparkleStar x={165} y={50} s={0.8} className="tm-star-twinkle-delay" />
      </>
    ),
    leftArm: 'M64 128Q40 150 46 188',
    rightArm: 'M136 128Q168 120 166 92',
    prop: (
      <>
        <circle cx={100} cy={34} r={22} fill={W} stroke={D} strokeWidth={3} />
        <rect x={90} y={54} width={20} height={10} rx={3} fill={T} />
        <path
          d="M70 22L58 14M130 22l12-8"
          stroke={D}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <g transform="translate(166 90)">
          <circle r={14} fill="#cdeefc" stroke={D} strokeWidth={3.5} />
          <path
            d="M10 10l18 18"
            stroke={D}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      </>
    ),
  },
  5: {
    back: null,
    leftArm: 'M64 128Q40 150 46 188',
    rightArm: 'M136 128Q168 100 156 56',
    prop: (
      <>
        <path
          d="M20 20h92a10 10 0 0110 10v34a10 10 0 01-10 10H70l-18 16 2-16H20a10 10 0 01-10-10V30a10 10 0 0110-10z"
          fill={W}
          stroke={D}
          strokeWidth={3}
          transform="translate(0 -6) scale(.8)"
        />
        <text
          x={52}
          y={46}
          fontSize={34}
          fontFamily="Georgia, serif"
          fontWeight={700}
          fill={D}
        >
          ?
        </text>
      </>
    ),
  },
  6: {
    back: (
      <>
        <path
          d="M0 238V200h60v-40h60v-40h80v118z"
          fill={W}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <SparkleStar x={160} y={60} className="tm-star-twinkle" />
      </>
    ),
    leftArm: 'M64 128Q36 100 44 70',
    rightArm: 'M136 128Q158 150 150 184',
    prop: null,
  },
  7: {
    back: <circle cx={100} cy={120} r={86} fill={W} opacity={0.7} />,
    leftArm: 'M64 128Q70 160 90 176',
    rightArm: 'M136 128Q130 160 110 176',
    prop: (
      <>
        <path
          d="M84 180h32l-5 30H89z"
          fill="#e0834a"
          stroke={D}
          strokeWidth={2.5}
          strokeLinejoin="round"
          transform="translate(0 -8)"
        />
        <path
          d="M100 172v-22M100 156q-18-2-20-18 18 0 20 18zM100 150q16-2 18-16-16 0-18 16z"
          fill="#4fb36c"
          stroke={D}
          strokeWidth={2.5}
          strokeLinejoin="round"
          transform="translate(0 -8)"
        />
      </>
    ),
  },
  8: {
    back: (
      <path
        d="M100 40c-6-22-40-18-40 6 0 22 40 40 40 52 0-12 40-30 40-52 0-24-34-28-40-6z"
        fill={P}
        stroke={D}
        strokeWidth={3}
        strokeLinejoin="round"
        transform="translate(0 -12)"
      />
    ),
    prop: (
      <>
        <SparkleStar x={36} y={150} className="tm-star-twinkle" />
        <SparkleStar x={170} y={170} s={0.8} className="tm-star-twinkle-delay" />
      </>
    ),
  },
  9: {
    closedEyes: true,
    back: (
      <>
        <path
          d="M120 30a40 40 0 1050 48 32 32 0 01-50-48z"
          fill={Y}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
          transform="translate(-30 0)"
        />
        <SparkleStar x={40} y={60} s={0.8} className="tm-star-twinkle" />
      </>
    ),
    prop: (
      <g fontFamily="Georgia, serif" fontWeight={700} fill={D}>
        <text x={136} y={76} fontSize={26}>
          z
        </text>
        <text x={154} y={52} fontSize={20}>
          z
        </text>
        <text x={168} y={34} fontSize={15}>
          z
        </text>
      </g>
    ),
  },
  10: {
    back: (
      <>
        <SparkleStar x={30} y={60} className="tm-star-twinkle" />
        <SparkleStar x={172} y={50} s={0.8} className="tm-star-twinkle-delay" />
      </>
    ),
    leftArm: 'M64 128Q50 160 72 172',
    rightArm: 'M136 128Q150 160 128 172',
    prop: (
      <>
        <path
          d="M58 160l42 8 42-8v44l-42 8-42-8z"
          fill={W}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d="M100 168v44M68 174l24 5M68 186l24 5M132 174l-24 5M132 186l-24 5"
          stroke={D}
          strokeWidth={2.5}
        />
      </>
    ),
  },
  11: {
    back: (
      <>
        <SparkleStar x={30} y={150} className="tm-star-twinkle" />
        <SparkleStar x={40} y={70} s={0.8} className="tm-star-twinkle-delay" />
        <SparkleStar x={170} y={170} s={0.7} className="tm-star-twinkle" />
      </>
    ),
    leftArm: 'M64 128Q40 150 46 188',
    rightArm: 'M136 128Q164 112 150 84',
    prop: (
      <g transform="rotate(35 156 56)">
        <path
          d="M156 6c16 14 16 40 12 54h-24c-4-14-4-40 12-54z"
          fill={W}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <circle cx={156} cy={34} r={6} fill={B} stroke={D} strokeWidth={2} />
        <path
          d="M144 56l-12 12 12-2zM168 56l12 12-12-2z"
          fill={P}
          stroke={D}
          strokeWidth={2.5}
        />
        <path
          d="M150 62l6 18 6-18z"
          fill={Y}
          stroke={D}
          strokeWidth={2.5}
        />
      </g>
    ),
  },
  12: {
    back: null,
    leftArm: 'M64 128Q40 150 46 188',
    rightArm: 'M136 128Q160 112 146 92',
    prop: (
      <>
        <circle cx={44} cy={60} r={28} fill={W} stroke={D} strokeWidth={3.5} />
        <path
          d="M44 60V42M44 60l14 8M44 36v-3M44 84v-3M20 60h3M65 60h3"
          stroke={D}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <path
          d="M168 80l8-8M176 96h12"
          stroke={D}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    ),
  },
  13: {
    back: (
      <>
        <SparkleStar x={36} y={70} className="tm-star-twinkle" />
        <SparkleStar x={168} y={70} s={0.8} className="tm-star-twinkle-delay" />
      </>
    ),
    leftArm: 'M64 128Q46 90 80 66',
    rightArm: 'M136 128Q154 90 120 66',
    prop: (
      <>
        <path
          d="M78 14h44v22a22 22 0 01-44 0z"
          fill={Y}
          stroke={D}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d="M78 20H62c0 18 8 24 18 24M122 20h16c0 18-8 24-18 24"
          fill="none"
          stroke={D}
          strokeWidth={3}
        />
        <path
          d="M100 58v8M88 68h24"
          stroke={D}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  14: {
    back: (
      <>
        <g stroke={Y} strokeWidth={7} strokeLinecap="round">
          <path d="M100 4v14M44 28l10 10M156 28l-10 10M14 84h14M172 84h14" />
        </g>
        <circle cx={100} cy={86} r={52} fill={Y} />
      </>
    ),
    leftArm: 'M64 128Q36 110 30 84',
    rightArm: 'M136 128Q164 110 170 84',
    prop: null,
  },
};

export interface MotivationIllustrationProps {
  sceneId: MotivationSceneId;
  bodyColor: string;
  className?: string;
}

export const MotivationIllustration: React.FC<MotivationIllustrationProps> = ({
  sceneId,
  bodyColor,
  className = 'w-full h-full',
}) => {
  const scene = SCENES[sceneId] ?? SCENES[14];

  return (
    <svg viewBox="0 0 200 250" aria-hidden="true" className={className}>
      {scene.back}
      <BeanCharacter color={bodyColor} closedEyes={scene.closedEyes} />
      <BeanArms left={scene.leftArm} right={scene.rightArm} />
      {scene.prop}
    </svg>
  );
};
