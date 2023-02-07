import {
  getResourceRId,
  ResourceShape,
  SessionClient,
} from '@matterio/core-util';
import MockDate from 'mockdate';
import { Store, createMockStore } from 'relational-redis-store';
import { SessionStore } from './SessionStore';
import { SessionResource } from './types';

let mockUUIDCount = 0;
const get_MOCKED_UUID = (count: number) => `MOCK-UUID-${count}`;
jest.mock('uuid', () => ({ v4: () => get_MOCKED_UUID(++mockUUIDCount) }));

type ShortMove = string;

type GameState = {
  phase: 'attack' | 'move';
  submission:
    | {
        status: 'none';
        white: {
          canDraw: true;
          moves: undefined;
        };
        black: {
          canDraw: true;
          moves: undefined;
        };
      }
    | {
        status: 'partial';
        white: {
          canDraw: true;
          moves: undefined;
        };
        black: {
          canDraw: false; // When canDraw is false it means player Submitted
          moves: undefined;
        };
      }
    | {
        status: 'partial';
        white: {
          canDraw: false; // When canDraw is false it means player Submitted
          moves: undefined;
        };
        black: {
          canDraw: true;
          moves: undefined;
        };
      }
    | {
        status: 'partial:revealed';
        black?: never;
        white: {
          canDraw: false;
          moves: ShortMove[];
        };
      }
    | {
        status: 'partial:revealed';
        black: {
          canDraw: false; // When canDraw is false it means player Submitted
          moves: ShortMove[];
        };
        white?: never;
      };
};

describe('SessionStore Fragments', () => {
  let store: Store<any>;
  let session: SessionStore<{
    room: SessionResource<{
      type: 'play' | 'analysis' | 'meetup';
    }>;
    game: SessionResource<GameState>;
  }>;

  const NOW_TIMESTAMP = new Date().getTime();

  const noop = () => {};

  const silentLogger = {
    ...console,
    info: noop,
    log: noop,
    warn: noop,
    error: noop,
  };

  beforeAll(async () => {
    // Date
    MockDate.set(NOW_TIMESTAMP);

    // Store
    store = createMockStore({ logger: silentLogger });
    session = new SessionStore(store);
  });

  afterAll(() => {
    // Date
    MockDate.reset();
  });

  let defaultClientId: SessionClient['id'];
  let createdResource: ResourceShape<'game', GameState>;

  const defaultGameData: GameState = {
    phase: 'move',
    submission: {
      status: 'none',
      white: {
        canDraw: true,
        moves: undefined,
      },
      black: {
        canDraw: true,
        moves: undefined,
      },
    },
  };

  const createDefaultGameResource = () =>
    session
      .createResource({
        resourceType: 'game',
        resourceData: defaultGameData,
      })
      .map((r) => r.item);

  beforeEach(async () => {
    mockUUIDCount = 0;

    store.flush();

    const defaultClient = await session
      .createClient({ id: 'defaultClientId' })
      .resolveUnwrap();

    defaultClientId = defaultClient.item.id;

    createdResource = await createDefaultGameResource().resolveUnwrap();
  });

  test('stores a private fragment', async () => {
    const additionRes = await session
      .addResourcePrivateFragment(
        defaultClientId,
        getResourceRId(createdResource),
        ['submission'],
        {
          status: 'partial:revealed',
          white: {
            canDraw: false,
            moves: ['Move1', 'Move2'],
          },
        }
      )
      .resolveUnwrap();

    expect(additionRes).toBe(undefined);
  });

  describe('Get Private/Public Resource', () => {
    describe('Non Nested Keys', () => {
      beforeEach(async () => {
        await session
          .addResourcePrivateFragment(
            defaultClientId,
            getResourceRId(createdResource),
            ['submission'],
            {
              status: 'partial:revealed',
              white: {
                canDraw: false,
                moves: ['Move1', 'Move2'],
              },
            }
          )
          .resolveUnwrap();
      });

      test('Gets the public version of the resource', async () => {
        const actual = await session
          .getResource(getResourceRId(createdResource))
          .resolveUnwrap();

        expect(actual).toEqual(createdResource);
      });

      test('Gets the private version of the resource', async () => {
        const actualPrivateResource = await session
          .getResource(getResourceRId(createdResource), defaultClientId)
          .resolveUnwrap();

        expect(actualPrivateResource).toEqual({
          ...createdResource,
          item: {
            ...createdResource.item,
            submission: {
              status: 'partial:revealed',
              white: {
                canDraw: false,
                moves: ['Move1', 'Move2'],
              },
              black: createdResource.item.submission.black,
            },
          },
        });
      });
    });

    describe('Nested keys', () => {
      beforeEach(async () => {
        await session
          .addResourcePrivateFragment(
            defaultClientId,
            getResourceRId(createdResource),
            ['submission', 'white'],
            {
              canDraw: false,
              moves: ['WhiteMove1', 'WhiteMove2'],
            }
          )
          .resolveUnwrap();
      });

      test('Gets the public version of the resource', async () => {
        const actual = await session
          .getResource(getResourceRId(createdResource))
          .resolveUnwrap();

        expect(actual).toEqual(createdResource);
      });

      test('Gets the private version of the resource', async () => {
        const actualPrivateResource = await session
          .getResource(getResourceRId(createdResource), defaultClientId)
          .resolveUnwrap();

        expect(actualPrivateResource).toEqual({
          ...createdResource,
          item: {
            ...createdResource.item,
            submission: {
              status: 'none',
              white: {
                canDraw: false,
                moves: ['WhiteMove1', 'WhteMove2'],
              },
              black: createdResource.item.submission.black,
            },
          },
        });
      });
    });
  });
});