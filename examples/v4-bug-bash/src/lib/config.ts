export const PROJECTS = {
  basic: {
    name: 'Basic + Holdout',
    sdkKey: process.env.NEXT_PUBLIC_BASIC_SDK_KEY ?? '',
  },
  cmab: {
    name: 'CMAB',
    sdkKey: process.env.NEXT_PUBLIC_CMAB_SDK_KEY ?? '',
  },
  odp: {
    name: 'ODP',
    sdkKey: process.env.NEXT_PUBLIC_ODP_SDK_KEY ?? '',
  },
} as const;

export const BASIC_FLAGS = {
  flag1: 'flag_1',
  flag2: 'flag_2',
} as const;

export const BASIC_EVENTS = {
  event1: 'event_1',
} as const;

export const CMAB_FLAGS = {
  cmabTest: 'cmab_test',
} as const;

export const ODP_FLAGS = {
  flag1: 'flag1',
  flag2: 'flag2',
  flag3: 'flag3',
  flagxx: 'flagxx',
} as const;

export const ODP_SEGMENTS = [
  'atsbugbashsegmenthaspurchased',
  'atsbugbashsegmentgender',
  'atsbugbashsegmentdob',
] as const;
