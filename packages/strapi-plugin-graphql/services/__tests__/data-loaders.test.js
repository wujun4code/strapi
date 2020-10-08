'use strict';

const dataLoaders = require('../data-loaders');

describe('dataloader', () => {
  describe('extractQueries', () => {
    test('Consistency', () => {
      global.strapi = {
        getModel: jest.fn(() => ({
          primaryKey: 'primaryKey',
        })),
      };

      const association = {
        via: 'reverseField',
      };

      const uid = 'uid';
      const keys = [
        {
          params: { primaryKey: 1 },
          single: true,
          options: {
            _limit: 10,
          },
        },
        {
          options: {
            query: {
              primaryKey: [1, 2, 3],
            },
            _sort: 'title',
          },
          association,
        },
        {
          options: {
            query: {
              reverseField: 12,
            },
            _publicationState: 'preview',
          },
          association,
        },
      ];

      const result = dataLoaders.extractQueries(uid, keys);

      expect(result).toEqual([
        {
          ids: [1],
          alias: 'primaryKey',
          options: { _limit: 10 },
        },
        {
          ids: [1, 2, 3],
          alias: 'primaryKey',
          options: { _sort: 'title' },
        },
        {
          ids: [12],
          alias: 'reverseField',
          options: {
            _publicationState: 'preview',
          },
        },
      ]);
    });
  });

  describe('serializeKey', () => {
    test('Serializes objects to json', () => {
      expect(dataLoaders.serializeKey(1928)).toBe(1928);
      expect(dataLoaders.serializeKey('test')).toBe('test');
      expect(dataLoaders.serializeKey([1, 2, 3])).toBe('[1,2,3]');
      expect(dataLoaders.serializeKey({ foo: 'bar' })).toBe('{"foo":"bar"}');
      expect(dataLoaders.serializeKey({ foo: 'bar', nested: { bar: 'foo' } })).toBe(
        '{"foo":"bar","nested":{"bar":"foo"}}'
      );
    });
  });

  describe('batchQuery', () => {
    test('1', async () => {
      global.strapi = {
        getModel: jest.fn(() => ({
          primaryKey: 'id',
          associations: [],
        })),
        query() {
          return {
            find: jest.fn(() => [{ id: 1 }]),
          };
        },
      };

      let tmpMapData = dataLoaders.mapData;
      dataLoaders.mapData = jest.fn((keys, res) => res);

      const uid = 'uid';
      const keys = [
        {
          options: {
            query: {
              rel: [1],
            },
            _limit: 10,
          },
          association: {
            via: 'rel',
          },
        },
      ];

      const results = await dataLoaders.batchQuery(uid, keys);

      expect(results).toEqual([[{ id: 1 }]]);
      expect(dataLoaders.mapData).toHaveBeenCalled();

      dataLoaders.mapData = tmpMapData;
    });
  });

  describe('mapData', () => {
    test('mapData', () => {
      const keys = [
        {
          single: true,
          params: {
            id: 1,
          },
        },
        {
          options: {
            query: {
              id: [1, 2, 3],
            },
          },
          association: {
            via: 'reverseField',
          },
        },
        {
          options: {
            query: {
              id: [1, 2, 3],
            },
            _start: 1,
            _limit: 1,
          },
          association: {
            via: 'reverseField',
          },
        },
        {
          options: {
            query: {
              reverseField: 1,
            },
          },
          association: {
            via: 'reverseField',
          },
        },
        {
          options: {
            query: {
              reverseField: 1,
            },
            _start: 1,
            _limit: 1,
          },
          association: {
            via: 'reverseField',
          },
        },
      ];

      const results = [
        [{ id: 1 }],
        [{ id: 1 }, { id: 3 }, { id: 2 }],
        [{ id: 2 }],
        [
          { id: 1, reverseField: { id: 1 } },
          { id: 2, reverseField: [{ id: 2 }, { id: 1 }] },
          { id: 3, reverseField: { id: 1 } },
        ],
        [{ id: 2, reverseField: [{ id: 2 }, { id: 1 }] }],
      ];

      const data = dataLoaders.mapData(keys, results);

      expect(data).toEqual([
        { id: 1 },
        [{ id: 1 }, { id: 3 }, { id: 2 }],
        [{ id: 2 }],
        [
          { id: 1, reverseField: { id: 1 } },
          { id: 2, reverseField: [{ id: 2 }, { id: 1 }] },
          { id: 3, reverseField: { id: 1 } },
        ],
        [{ id: 2, reverseField: [{ id: 2 }, { id: 1 }] }],
      ]);
    });
  });

  describe('makeQuery', () => {
    test.each([{}, { ids: [] }, { ids: '' }])(
      'returns empty array if ids are empty',
      async input => {
        const uid = 'uid';
        const result = await dataLoaders.makeQuery(uid, input);

        expect(result).toEqual([]);
      }
    );

    test('makeQuery', async () => {
      const uid = 'uid';
      const find = jest.fn(() => [{ id: 1 }]);

      global.strapi = {
        getModel: jest.fn(() => ({
          primaryKey: 'id',
          associations: [
            {
              alias: 'fieldName',
            },
          ],
        })),
        query() {
          return {
            find,
          };
        },
      };

      await dataLoaders.makeQuery(uid, {
        ids: [1, 2],
        alias: 'fieldName',
      });

      expect(find).toHaveBeenCalledWith(
        {
          fieldName_in: ['1', '2'],
        },
        []
      );
    });

    test('makeQuery - 2', async () => {
      const uid = 'uid';
      const find = jest.fn(() => [{ id: 1 }]);

      global.strapi = {
        getModel: jest.fn(() => ({
          primaryKey: 'id',
          associations: [],
        })),
        query() {
          return {
            find,
          };
        },
      };

      await dataLoaders.makeQuery(uid, {
        ids: [1],
        alias: 'id',
      });

      expect(find).toHaveBeenCalledWith(
        {
          id_in: ['1'],
        },
        []
      );
    });

    test('makeQuery - 3', async () => {
      const uid = 'uid';
      const find = jest.fn(() => [{ id: 1 }]);

      global.strapi = {
        getModel: jest.fn(() => ({
          primaryKey: 'id',
          associations: [],
        })),
        query() {
          return {
            find,
          };
        },
      };

      await dataLoaders.makeQuery(uid, {
        ids: [1],
        options: {
          _limit: 5,
          _sort: 'field',
        },
        alias: 'id',
      });

      expect(find).toHaveBeenCalledWith(
        {
          _limit: 5,
          _sort: 'field',
          id_in: ['1'],
        },
        []
      );
    });
  });
});
