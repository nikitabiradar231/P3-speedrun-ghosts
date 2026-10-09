export const SPEEDRUN_GHOSTS_ABI = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'levelHash',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'levelVersion',
    inputs: [],
    outputs: [{ name: '', type: 'uint16', internalType: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'submitRun',
    inputs: [{ name: 'inputs', type: 'bytes', internalType: 'bytes' }],
    outputs: [
      { name: 'finishTick', type: 'uint16', internalType: 'uint16' },
      { name: 'runId', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'simulate',
    inputs: [{ name: 'inputs', type: 'bytes', internalType: 'bytes' }],
    outputs: [
      { name: 'finishTick', type: 'uint16', internalType: 'uint16' },
      { name: 'completed', type: 'bool', internalType: 'bool' },
      { name: 'died', type: 'bool', internalType: 'bool' },
      { name: 'deathTick', type: 'uint16', internalType: 'uint16' },
      { name: 'finalX', type: 'int32', internalType: 'int32' },
      { name: 'finalY', type: 'int32', internalType: 'int32' },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getRun',
    inputs: [{ name: 'runId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ISpeedrunGhosts.RunRecord',
        components: [
          { name: 'player', type: 'address', internalType: 'address' },
          { name: 'finishTick', type: 'uint16', internalType: 'uint16' },
          { name: 'timestamp', type: 'uint32', internalType: 'uint32' },
          { name: 'inputs', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRunInputs',
    inputs: [{ name: 'runId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'bytes', internalType: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRunCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPersonalBest',
    inputs: [{ name: 'player', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'bestTick', type: 'uint16', internalType: 'uint16' },
      { name: 'runId', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLeaderboard',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: 'records',
        type: 'tuple[]',
        internalType: 'struct ISpeedrunGhosts.RunRecord[]',
        components: [
          { name: 'player', type: 'address', internalType: 'address' },
          { name: 'finishTick', type: 'uint16', internalType: 'uint16' },
          { name: 'timestamp', type: 'uint32', internalType: 'uint32' },
          { name: 'inputs', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RunVerified',
    inputs: [
      { name: 'player', type: 'address', indexed: true, internalType: 'address' },
      { name: 'runId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'finishTick', type: 'uint16', indexed: false, internalType: 'uint16' },
      { name: 'timestamp', type: 'uint32', indexed: false, internalType: 'uint32' },
      { name: 'inputs', type: 'bytes', indexed: false, internalType: 'bytes' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PersonalBestUpdated',
    inputs: [
      { name: 'player', type: 'address', indexed: true, internalType: 'address' },
      { name: 'oldBestTick', type: 'uint16', indexed: false, internalType: 'uint16' },
      { name: 'newBestTick', type: 'uint16', indexed: false, internalType: 'uint16' },
      { name: 'runId', type: 'uint256', indexed: true, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'EmptyInputLog',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InputExceedsMaxTicks',
    inputs: [
      { name: 'length', type: 'uint256', internalType: 'uint256' },
      { name: 'maxAllowed', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidInputByte',
    inputs: [
      { name: 'tickIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'inputByte', type: 'uint8', internalType: 'uint8' },
    ],
  },
  {
    type: 'error',
    name: 'PlayerDied',
    inputs: [
      { name: 'tickIndex', type: 'uint256', internalType: 'uint256' },
      { name: 'x', type: 'int32', internalType: 'int32' },
      { name: 'y', type: 'int32', internalType: 'int32' },
    ],
  },
  {
    type: 'error',
    name: 'RunDidNotFinish',
    inputs: [
      { name: 'ticksSimulated', type: 'uint256', internalType: 'uint256' },
      { name: 'finalX', type: 'int32', internalType: 'int32' },
      { name: 'finalY', type: 'int32', internalType: 'int32' },
    ],
  },
  {
    type: 'error',
    name: 'RunNotFound',
    inputs: [{ name: 'runId', type: 'uint256', internalType: 'uint256' }],
  },
] as const;
